import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BillingCatalogService } from './catalog/billing.catalog.service';
import { BillingCustomerService } from './billing-customer.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingDunningService } from './billing-dunning.service';
import { BillingPlanCode, BillingPlanVariant } from './billing.types';
import { StripeService, StripeCharge, StripeCheckoutSession, StripeEvent, StripeInvoice, StripePaymentIntent, StripeSubscription } from './stripe/stripe.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { invoices, invoice_status, plan_interval, payment_status, Prisma, subscription_collection_method, subscription_status } from '@prisma/client';

type BillingCustomerWithRelations = Prisma.billing_customersGetPayload<{ include: { user: true; organization: true } }>;

@Injectable()
export class BillingWebhookService {
  private readonly logger = new Logger(BillingWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly customers: BillingCustomerService,
    private readonly entitlements: BillingEntitlementsService,
    private readonly invoices: BillingInvoiceService,
    private readonly catalog: BillingCatalogService,
    private readonly dunning: BillingDunningService,
    private readonly mailer: TemplateMailerService,
    @InjectQueue('billing') private readonly billingQueue: Queue,
  ) {}

  private readonly localeFallback: 'fr' | 'en' = 'fr';

  private readonly intlCache = new Map<string, Intl.NumberFormat>();

  private readonly dateFormatCache = new Map<string, Intl.DateTimeFormat>();

  async receiveWebhook(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructWebhookEvent(payload, signature);
    const stored = await this.prisma.billing_events.upsert({
      where: { stripe_event_id: event.id },
      update: {
        type: event.type,
        payload: event as any,
        processed: false,
        processed_at: null,
        error_message: null,
      },
      create: {
        stripe_event_id: event.id,
        type: event.type,
        payload: event as any,
      },
    });

    await this.billingQueue.add(
      'process-event',
      { eventId: stored.id },
      { jobId: `stripe-event:${event.id}` },
    );
  }

  async processStoredEvent(eventId: string): Promise<void> {
    const stored = await this.prisma.billing_events.findUnique({ where: { id: eventId } });
    if (!stored) return;
    const event = stored.payload as StripeEvent;
    try {
      await this.handleEvent(event);
      await this.prisma.billing_events.update({
        where: { id: eventId },
        data: { processed: true, processed_at: new Date(), error_message: null },
      });
    } catch (error) {
      this.logger.error(`Error processing Stripe event ${stored.stripe_event_id}`, error as Error);
      await this.prisma.billing_events.update({
        where: { id: eventId },
        data: { processed: false, error_message: (error as Error).message },
      });
      throw error;
    }
  }

  private async handleEvent(event: StripeEvent) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutSessionCompleted(event.data.object as StripeCheckoutSession);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as StripeSubscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as StripeSubscription);
        break;
      case 'invoice.finalized':
        await this.onInvoiceFinalized(event.data.object as StripeInvoice);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as StripeInvoice);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as StripeInvoice);
        break;
      case 'invoice.voided':
        await this.onInvoiceVoided(event.data.object as StripeInvoice);
        break;
      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(event.data.object as StripePaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFailed(event.data.object as StripePaymentIntent);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as StripeCharge);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event ${event.type}`);
        break;
    }
  }

  private async onCheckoutSessionCompleted(session: StripeCheckoutSession) {
    if (!session.customer) return;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    await this.customers.refreshFromStripe(stripeCustomerId);

    const metadata = session.metadata ?? {};
    const userId = metadata.user_id ?? undefined;
    const organizationId = metadata.organization_id ?? undefined;
    const planCode = (metadata.plan_code as BillingPlanCode | undefined) ?? undefined;
    const interval = (metadata.interval as 'month' | 'year' | undefined) ?? 'month';

    if (session.subscription) {
      const subscription = await this.stripe.client.subscriptions.retrieve(session.subscription as string, {
        expand: ['default_payment_method', 'items.data.price'],
      });
      await this.upsertSubscriptionFromStripe(subscription, {
        userId,
        organizationId,
      });
    } else if (planCode && userId) {
      const variant = this.catalog.getVariant(planCode, interval ?? 'month');
      await this.activateManualSubscription(userId, stripeCustomerId, variant, organizationId);
    }
  }

  private async onSubscriptionUpdated(subscription: StripeSubscription) {
    await this.customers.refreshFromStripe(subscription.customer as string);
    await this.upsertSubscriptionFromStripe(subscription);
  }

  private async onSubscriptionDeleted(subscription: StripeSubscription) {
    const existing = await this.prisma.subscriptions.findFirst({
      where: { external_subscription_id: subscription.id },
    });
    if (!existing) return;
    await this.prisma.subscriptions.update({
      where: { id: existing.id },
      data: {
        status: subscription_status.canceled,
        canceled_at: subscription.canceled_at ? toDate(subscription.canceled_at) : new Date(),
        ended_reason: subscription.cancellation_details?.comment ?? 'canceled_by_stripe',
      },
    });
    await this.entitlements.syncForSubscription(existing.id, existing.plan_code as BillingPlanCode);
  }

  private async onInvoiceFinalized(invoice: StripeInvoice) {
    const context = await this.resolveInvoiceContext(invoice);
    if (!context) return;
    const { record, created } = await this.invoices.upsertFromStripe({
      stripeInvoice: invoice,
      subscriptionId: context.subscriptionId,
      billingCustomerId: context.billingCustomer?.id ?? context.billingCustomerId,
    });
    if (created) {
      await this.safeExecute(`invoice-issued:${invoice.id}`, () =>
        this.notifyInvoiceIssued(invoice, record, context.billingCustomer ?? null),
      );
    }
  }

  private async onInvoicePaid(invoice: StripeInvoice) {
    const context = await this.resolveInvoiceContext(invoice);
    if (!context) return;
    const { record: invoiceRecord, previousStatus } = await this.invoices.upsertFromStripe({
      stripeInvoice: invoice,
      subscriptionId: context.subscriptionId,
      billingCustomerId: context.billingCustomer?.id ?? context.billingCustomerId,
    });

    let billingCustomerId = context.billingCustomer?.id ?? context.billingCustomerId;
    let paymentIntent: StripePaymentIntent | null = null;
    if (!billingCustomerId && invoice.customer) {
      const refreshed = await this.customers.refreshFromStripe(invoice.customer as string);
      billingCustomerId = refreshed?.id ?? undefined;
    }

    if (invoice.payment_intent && billingCustomerId) {
      paymentIntent = typeof invoice.payment_intent === 'string'
        ? await this.stripe.client.paymentIntents.retrieve(invoice.payment_intent, {
          expand: ['charges.data.payment_method_details'],
        })
        : invoice.payment_intent;
      await this.upsertPayment(paymentIntent as StripePaymentIntent, invoiceRecord.id, billingCustomerId);
    }

    await this.prisma.subscriptions.update({
      where: { id: context.subscriptionId },
      data: { status: subscription_status.active, cancel_at: null, canceled_at: null },
    });

    if (invoiceRecord.status === invoice_status.paid && previousStatus !== invoice_status.paid) {
      await this.safeExecute(`invoice-paid:${invoice.id}`, () =>
        this.notifyPaymentReceived(
          invoice,
          invoiceRecord,
          context.billingCustomer ?? null,
          paymentIntent as StripePaymentIntent | null,
        ),
      );
    }
  }

  private async onInvoicePaymentFailed(invoice: StripeInvoice) {
    const context = await this.resolveInvoiceContext(invoice);
    if (!context) return;
    await this.invoices.upsertFromStripe({
      stripeInvoice: invoice,
      subscriptionId: context.subscriptionId,
      billingCustomerId: context.billingCustomer?.id ?? context.billingCustomerId,
    });
    await this.prisma.subscriptions.update({
      where: { id: context.subscriptionId },
      data: { status: subscription_status.past_due },
    });
    await this.dunning.schedule(invoice, context.subscriptionId);
  }

  private async onInvoiceVoided(invoice: StripeInvoice) {
    const context = await this.resolveInvoiceContext(invoice);
    if (!context) return;
    await this.prisma.invoices.updateMany({
      where: { stripe_invoice_id: invoice.id },
      data: { status: invoice_status.void, paid_at: null },
    });
  }

  private async onPaymentIntentSucceeded(paymentIntent: StripePaymentIntent) {
    if (!paymentIntent.invoice) return;
    const invoiceRecord = await this.prisma.invoices.findFirst({
      where: { stripe_invoice_id: paymentIntent.invoice as string },
    });
    let billingCustomer = await this.prisma.billing_customers.findFirst({
      where: { stripe_customer_id: paymentIntent.customer as string },
    });
    if (!billingCustomer && paymentIntent.customer) {
      billingCustomer = await this.customers.refreshFromStripe(paymentIntent.customer as string) ?? null;
    }
    if (!billingCustomer) {
      this.logger.warn(`Unable to resolve billing customer for payment intent ${paymentIntent.id}`);
      return;
    }
    await this.upsertPayment(paymentIntent, invoiceRecord?.id ?? null, billingCustomer.id);
  }

  private async onPaymentIntentFailed(paymentIntent: StripePaymentIntent) {
    if (paymentIntent.customer) {
      await this.customers.refreshFromStripe(paymentIntent.customer as string);
    }
    const billingCustomer = paymentIntent.customer
      ? await this.prisma.billing_customers.findFirst({ where: { stripe_customer_id: paymentIntent.customer as string } })
      : null;
    if (!billingCustomer) {
      this.logger.warn(`Unable to resolve billing customer for failed payment ${paymentIntent.id}`);
      return;
    }
    const invoiceRecord = paymentIntent.invoice
      ? await this.prisma.invoices.findFirst({ where: { stripe_invoice_id: paymentIntent.invoice as string } })
      : null;
    await this.upsertPayment(paymentIntent, invoiceRecord?.id ?? null, billingCustomer.id);
  }

  private async onChargeRefunded(charge: StripeCharge) {
    if (!charge.payment_intent) return;
    await this.prisma.billing_payments.updateMany({
      where: { stripe_payment_intent_id: charge.payment_intent as string },
      data: {
        status: payment_status.canceled,
        processed_at: new Date(),
      },
    });
  }

  async syncCustomer(stripeCustomerId: string) {
    const customer = await this.customers.refreshFromStripe(stripeCustomerId);
    const subscriptions = await this.stripe.client.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      expand: ['data.items.data.price', 'data.default_payment_method'],
    });
    for (const subscription of subscriptions.data) {
      await this.upsertSubscriptionFromStripe(subscription);
    }

    const invoices = await this.stripe.client.invoices.list({
      customer: stripeCustomerId,
      limit: 20,
      expand: ['data.payment_intent'],
    });
    for (const invoice of invoices.data) {
      await this.onInvoiceFinalized(invoice);
      if (invoice.status === 'paid') {
        await this.onInvoicePaid(invoice);
      }
    }
    return customer;
  }

  private async activateManualSubscription(
    userId: string,
    stripeCustomerId: string,
    variant: BillingPlanVariant,
    organizationId?: string,
  ) {
    const plan = await this.prisma.plans.findUnique({ where: { code: variant.planCodeForDatabase } });
    if (!plan) return;
    const billingCustomer = await this.prisma.billing_customers.findFirst({
      where: { stripe_customer_id: stripeCustomerId },
    });
    if (!billingCustomer) return;

    const subscription = await this.prisma.subscriptions.create({
      data: {
        user_id: userId,
        plan_id: plan.id,
        plan_code: variant.plan.code,
        billing_interval: variant.interval === 'year' ? plan_interval.year : plan_interval.month,
        billing_customer_id: billingCustomer.id,
        organization_id: organizationId ?? undefined,
        status: subscription_status.active,
        collection_method: subscription_collection_method.charge_automatically,
        external_customer_id: stripeCustomerId,
      },
    });
    await this.entitlements.syncForSubscription(subscription.id, variant.plan.code as BillingPlanCode);
  }

  private async upsertSubscriptionFromStripe(
    stripeSubscription: StripeSubscription,
    context?: { userId?: string; organizationId?: string },
  ) {
    const price = stripeSubscription.items.data[0]?.price;
    const variant = price ? this.catalog.findByStripePriceId(price.id) : undefined;
    const planCode = (stripeSubscription.metadata?.plan_code as BillingPlanCode | undefined) ?? variant?.plan.code;
    const interval = variant?.interval ?? (price?.recurring?.interval === 'year' ? 'year' : 'month');
    if (!planCode) {
      this.logger.warn(`Unable to resolve plan code for subscription ${stripeSubscription.id}`);
      return;
    }

    const plan = await this.prisma.plans.findUnique({
      where: { code: `${planCode}-${interval}` },
    });
    if (!plan) {
      this.logger.warn(`Plan record missing for ${planCode}-${interval}`);
      return;
    }

    const billingCustomer = await this.customers.refreshFromStripe(stripeSubscription.customer as string);
    const userId = context?.userId
      ?? (typeof stripeSubscription.metadata?.user_id === 'string' ? stripeSubscription.metadata.user_id : undefined)
      ?? billingCustomer?.user_id
      ?? undefined;
    if (!userId) {
      this.logger.warn(`Subscription ${stripeSubscription.id} missing user binding`);
      return;
    }

    const existing = await this.prisma.subscriptions.findFirst({
      where: { external_subscription_id: stripeSubscription.id },
    });

    const data = {
      user_id: userId,
      plan_id: plan.id,
      plan_code: planCode,
      billing_interval: interval === 'year' ? plan_interval.year : plan_interval.month,
      billing_customer_id: billingCustomer?.id,
      organization_id: context?.organizationId ?? billingCustomer?.organization_id ?? undefined,
      status: this.mapSubscriptionStatus(stripeSubscription.status),
      collection_method: stripeSubscription.collection_method === 'send_invoice'
        ? subscription_collection_method.send_invoice
        : subscription_collection_method.charge_automatically,
      external_customer_id: stripeSubscription.customer as string,
      external_subscription_id: stripeSubscription.id,
      default_payment_method_id: typeof stripeSubscription.default_payment_method === 'string'
        ? stripeSubscription.default_payment_method
        : stripeSubscription.default_payment_method?.id,
      current_period_start: stripeSubscription.current_period_start ? toDate(stripeSubscription.current_period_start) : undefined,
      current_period_end: stripeSubscription.current_period_end ? toDate(stripeSubscription.current_period_end) : undefined,
      cancel_at: stripeSubscription.cancel_at ? toDate(stripeSubscription.cancel_at) : null,
      canceled_at: stripeSubscription.canceled_at ? toDate(stripeSubscription.canceled_at) : null,
      trial_start: stripeSubscription.trial_start ? toDate(stripeSubscription.trial_start) : null,
      trial_end: stripeSubscription.trial_end ? toDate(stripeSubscription.trial_end) : null,
      billing_cycle_anchor: stripeSubscription.billing_cycle_anchor
        ? toDate(stripeSubscription.billing_cycle_anchor)
        : undefined,
    } as const;

    let subscriptionRecord;
    if (existing) {
      subscriptionRecord = await this.prisma.subscriptions.update({
        where: { id: existing.id },
        data,
      });
    } else {
      subscriptionRecord = await this.prisma.subscriptions.create({
        data: {
          ...data,
          user_id: userId,
          seats: stripeSubscription.items.data[0]?.quantity ?? 1,
        },
      });
    }

    await this.entitlements.syncForSubscription(subscriptionRecord.id, planCode);
  }

  private async resolveInvoiceContext(invoice: StripeInvoice): Promise<{
    subscriptionId: string;
    billingCustomerId?: string | null;
    billingCustomer?: BillingCustomerWithRelations | null;
  } | null> {
    if (!invoice.subscription) return null;
    const subscription = await this.prisma.subscriptions.findFirst({
      where: { external_subscription_id: invoice.subscription as string },
    });
    if (!subscription) {
      this.logger.warn(`Local subscription not found for invoice ${invoice.id}`);
      return null;
    }
    const billingCustomer = invoice.customer
      ? await this.prisma.billing_customers.findFirst({
        where: { stripe_customer_id: invoice.customer as string },
        include: { user: true, organization: true },
      })
      : null;
    return { subscriptionId: subscription.id, billingCustomerId: billingCustomer?.id, billingCustomer };
  }

  private async upsertPayment(paymentIntent: StripePaymentIntent, invoiceId: string | null, billingCustomerId: string) {
    const status = this.mapPaymentStatus(paymentIntent.status);
    await this.prisma.billing_payments.upsert({
      where: { stripe_payment_intent_id: paymentIntent.id },
      update: {
        billing_customer_id: billingCustomerId,
        invoice_id: invoiceId ?? undefined,
        amount_cents: paymentIntent.amount_received ?? paymentIntent.amount ?? 0,
        currency: (paymentIntent.currency ?? 'eur').toUpperCase(),
        status,
        payment_method_type: paymentIntent.payment_method_types?.[0],
        receipt_url: paymentIntent.charges?.data?.[0]?.receipt_url ?? undefined,
        processed_at: new Date(),
      },
      create: {
        billing_customer_id: billingCustomerId,
        invoice_id: invoiceId ?? undefined,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount_received ?? paymentIntent.amount ?? 0,
        currency: (paymentIntent.currency ?? 'eur').toUpperCase(),
        status,
        payment_method_type: paymentIntent.payment_method_types?.[0],
        receipt_url: paymentIntent.charges?.data?.[0]?.receipt_url ?? undefined,
        processed_at: new Date(),
      },
    });
  }

  private async notifyInvoiceIssued(
    invoice: StripeInvoice,
    record: invoices,
    billingCustomer: BillingCustomerWithRelations | null,
  ) {
    const recipients = this.buildRecipients(invoice, billingCustomer);
    if (!recipients) return;
    const { emails, locale, customerName } = recipients;
    const amountFormatted = this.formatAmount(record.total_cents ?? record.amount_cents, record.currency, locale);
    const dueDate = record.due_at ? this.formatDate(record.due_at, locale) : undefined;
    await this.sendEmails(emails, 'billing-invoice-created', locale, {
      customer_name: customerName,
      amount_formatted: amountFormatted,
      invoice_number: record.number ?? invoice.number ?? undefined,
      due_date: dueDate,
      invoice_url: invoice.hosted_invoice_url ?? record.pdf_url ?? undefined,
      pdf_url: record.pdf_url ?? invoice.invoice_pdf ?? undefined,
    });
  }

  private async notifyPaymentReceived(
    invoice: StripeInvoice,
    record: invoices,
    billingCustomer: BillingCustomerWithRelations | null,
    paymentIntent: StripePaymentIntent | null,
  ) {
    const recipients = this.buildRecipients(invoice, billingCustomer);
    if (!recipients) return;
    const { emails, locale, customerName } = recipients;
    const amountFormatted = this.formatAmount(record.total_cents ?? record.amount_cents, record.currency, locale);
    const receiptUrl = paymentIntent?.charges?.data?.[0]?.receipt_url ?? undefined;
    await this.sendEmails(emails, 'billing-payment-receipt', locale, {
      customer_name: customerName,
      amount_formatted: amountFormatted,
      invoice_number: record.number ?? invoice.number ?? undefined,
      invoice_url: invoice.hosted_invoice_url ?? record.pdf_url ?? undefined,
      pdf_url: record.pdf_url ?? invoice.invoice_pdf ?? undefined,
      receipt_url: receiptUrl,
      payment_method: this.formatPaymentMethod(paymentIntent),
    });
  }

  private buildRecipients(
    invoice: StripeInvoice,
    billingCustomer: BillingCustomerWithRelations | null,
  ): { emails: string[]; locale: 'fr' | 'en'; customerName?: string } | null {
    const recipients = new Map<string, string>();
    const addRecipient = (email?: string | null) => {
      if (!email) return;
      const trimmed = email.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!recipients.has(key)) {
        recipients.set(key, trimmed);
      }
    };

    addRecipient(invoice.customer_email ?? undefined);
    if (billingCustomer) {
      addRecipient(billingCustomer.email ?? undefined);
      addRecipient(billingCustomer.organization?.billing_email ?? undefined);
      addRecipient(billingCustomer.user?.email ?? undefined);
    }

    const emails = Array.from(recipients.values());
    if (emails.length === 0) return null;

    const locale = this.resolveLocale(billingCustomer?.locale);
    const customerName = billingCustomer?.name
      ?? billingCustomer?.organization?.legal_name
      ?? invoice.customer_name
      ?? undefined;

    return { emails, locale, customerName };
  }

  private resolveLocale(locale?: string | null): 'fr' | 'en' {
    if (!locale) return this.localeFallback;
    const normalized = locale.toLowerCase();
    if (normalized.startsWith('en')) {
      return 'en';
    }
    if (normalized.startsWith('fr')) {
      return 'fr';
    }
    return this.localeFallback;
  }

  private formatAmount(
    amountCents: number | null | undefined,
    currency: string | null | undefined,
    locale: 'fr' | 'en',
  ): string {
    const amount = (amountCents ?? 0) / 100;
    const currencyCode = (currency ?? 'EUR').toUpperCase();
    const key = `${locale}:${currencyCode}`;
    let formatter = this.intlCache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
      });
      this.intlCache.set(key, formatter);
    }
    return formatter.format(amount);
  }

  private formatDate(date: Date, locale: 'fr' | 'en'): string {
    const key = `${locale}:date`;
    let formatter = this.dateFormatCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      this.dateFormatCache.set(key, formatter);
    }
    return formatter.format(date);
  }

  private formatPaymentMethod(paymentIntent?: StripePaymentIntent | null): string | undefined {
    if (!paymentIntent) return undefined;
    const charge = paymentIntent.charges?.data?.[0];
    const details = charge?.payment_method_details;
    if (details?.card) {
      const brand = details.card.brand ? details.card.brand.toUpperCase() : 'CARD';
      const last4 = details.card.last4 ? `•••• ${details.card.last4}` : undefined;
      return [brand, last4].filter(Boolean).join(' ');
    }
    if (details?.sepa_debit) {
      const last4 = details.sepa_debit.last4 ? `•••• ${details.sepa_debit.last4}` : undefined;
      return ['SEPA', last4].filter(Boolean).join(' ');
    }
    const type = details?.type ?? paymentIntent.payment_method_types?.[0];
    return type ? type.replace(/_/g, ' ').toUpperCase() : undefined;
  }

  private async sendEmails(
    emails: string[],
    template: string,
    locale: 'fr' | 'en',
    data: Record<string, any>,
  ) {
    await Promise.all(emails.map(email => this.mailer.sendTemplate(email, template, locale, data)));
  }

  private async safeExecute(label: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.warn(`Non-blocking billing notification error (${label}): ${(error as Error).message}`);
    }
  }

  private mapSubscriptionStatus(status: string): subscription_status {
    switch (status) {
      case 'trialing':
        return subscription_status.trialing;
      case 'active':
        return subscription_status.active;
      case 'past_due':
      case 'incomplete':
      case 'incomplete_expired':
      case 'unpaid':
      case 'paused':
        return subscription_status.past_due;
      case 'canceled':
        return subscription_status.canceled;
      default:
        return subscription_status.active;
    }
  }

  private mapPaymentStatus(status: string | null | undefined): payment_status {
    switch (status) {
      case 'succeeded':
        return payment_status.succeeded;
      case 'processing':
        return payment_status.processing;
      case 'canceled':
        return payment_status.canceled;
      case 'requires_action':
        return payment_status.requires_action;
      default:
        return payment_status.requires_payment_method;
    }
  }
}

function toDate(unix: number): Date {
  return new Date(unix * 1000);
}
