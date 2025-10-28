import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { BillingWebhookService } from '../billing-webhook.service';
import { BillingEntitlementsService } from '../billing-entitlements.service';
import {
  BillingAdminCustomerType,
  BillingAdminInvoiceType,
  BillingAdminOrganizationType,
  BillingAdminPaymentType,
  BillingAdminPlanType,
  BillingAdminSubscriptionType,
  BillingAdminUserProfileType,
  BillingAdminUserSummaryType,
} from './billing-admin.graphql-types';
import {
  BillingInterval,
  BillingIntervalEnum,
  BillingPlanCode,
  BillingPlanCodeEnum,
} from '../billing.types';
import { AppError } from '../../../common/errors/app-error.factory';

@Injectable()
export class BillingAdminService {
  private readonly logger = new Logger(BillingAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: BillingWebhookService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async listCustomers(): Promise<BillingAdminCustomerType[]> {
    const customers = await this.prisma.billing_customers.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: this.customerIncludes(),
    });
    return customers.map((customer) => this.mapCustomer(customer));
  }

  async forceSyncCustomer(stripeCustomerId: string): Promise<BillingAdminCustomerType | null> {
    const customer = await this.webhook.syncCustomer(stripeCustomerId);
    if (!customer) {
      return null;
    }
    return this.getCustomerByStripeId(customer.stripe_customer_id);
  }

  async updateEntitlement(subscriptionId: string, featureCode: string, limit: number | null) {
    await this.prisma.entitlements.upsert({
      where: {
        subscription_id_feature_code: {
          subscription_id: subscriptionId,
          feature_code: featureCode,
        },
      },
      update: {
        limit_value: limit ?? undefined,
      },
      create: {
        subscription_id: subscriptionId,
        feature_code: featureCode,
        limit_value: limit ?? undefined,
      },
    });
    const subscription = await this.prisma.subscriptions.findUnique({ where: { id: subscriptionId } });
    if (subscription) {
      await this.entitlements.syncForSubscription(subscriptionId, subscription.plan_code as BillingPlanCode);
    }
  }

  async regenerateInvoiceSequence(year: number) {
    if (process.env.NODE_ENV === 'production') {
      throw AppError.forbidden('invoice.sequence.regeneration.is.read.only.in.production');
    }
    const invoices = await this.prisma.invoices.findMany({
      where: {
        issued_at: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      orderBy: { issued_at: 'asc' },
    });
    let counter = 0;
    for (const invoice of invoices) {
      counter += 1;
      const number = `${year}-${String(counter).padStart(6, '0')}`;
      if (invoice.number !== number) {
        this.logger.warn(`Invoice ${invoice.id} renumbered from ${invoice.number} to ${number}`);
        await this.prisma.invoices.update({
          where: { id: invoice.id },
          data: { number },
        });
      }
    }
    await this.prisma.billing_invoice_sequences.upsert({
      where: { year },
      update: { last_value: counter, updated_at: new Date() },
      create: { year, last_value: counter },
    });
    return { year, count: counter };
  }

  async getCustomerByStripeId(stripeCustomerId: string): Promise<BillingAdminCustomerType | null> {
    const customer = await this.prisma.billing_customers.findUnique({
      where: { stripe_customer_id: stripeCustomerId },
      include: this.customerIncludes(),
    });
    return customer ? this.mapCustomer(customer) : null;
  }

  private customerIncludes() {
    return {
      subscriptions: {
        orderBy: { started_at: 'desc' },
        take: 3,
        include: {
          plans: true,
          invoices: { orderBy: { issued_at: 'desc' }, take: 5 },
        },
      },
      invoices: { orderBy: { issued_at: 'desc' }, take: 5 },
      payments: { orderBy: { processed_at: 'desc' }, take: 5 },
      organization: true,
      user: {
        select: {
          email: true,
          profiles: { select: { display_name: true }, take: 1 },
        },
      },
    } as const;
  }

  private mapCustomer(customer: any): BillingAdminCustomerType {
    return {
      id: customer.id,
      stripe_customer_id: customer.stripe_customer_id,
      email: customer.email,
      name: customer.name ?? null,
      locale: customer.locale ?? null,
      vat_number: customer.vat_number ?? null,
      vat_valid: Boolean(customer.vat_valid),
      organization: customer.organization
        ? this.mapOrganization(customer.organization)
        : null,
      user: customer.user ? this.mapUser(customer.user) : null,
      subscriptions: Array.isArray(customer.subscriptions)
        ? customer.subscriptions.map((subscription: any) =>
            this.mapSubscription(subscription),
          )
        : [],
      invoices: Array.isArray(customer.invoices)
        ? customer.invoices.map((invoice: any) => this.mapInvoice(invoice))
        : [],
      payments: Array.isArray(customer.payments)
        ? customer.payments.map((payment: any) => this.mapPayment(payment))
        : [],
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    } as BillingAdminCustomerType;
  }

  private mapOrganization(organization: any): BillingAdminOrganizationType {
    return {
      id: organization.id,
      name: organization.name ?? null,
    } as BillingAdminOrganizationType;
  }

  private mapUser(user: any): BillingAdminUserSummaryType {
    const profile = Array.isArray(user.profiles) ? user.profiles[0] ?? null : null;
    return {
      email: user.email ?? null,
      profiles: profile ? this.mapUserProfile(profile) : null,
    } as BillingAdminUserSummaryType;
  }

  private mapUserProfile(profile: any): BillingAdminUserProfileType {
    return {
      display_name: profile.display_name ?? null,
    } as BillingAdminUserProfileType;
  }

  private mapSubscription(subscription: any): BillingAdminSubscriptionType {
    return {
      id: subscription.id,
      plan_code: this.normalizePlanCode(subscription.plan_code),
      billing_interval: this.normalizeBillingInterval(subscription.billing_interval),
      status: subscription.status,
      started_at: subscription.started_at,
      current_period_end: subscription.current_period_end ?? null,
      external_subscription_id: subscription.external_subscription_id ?? null,
      plans: subscription.plans ? this.mapPlan(subscription.plans) : null,
      invoices: Array.isArray(subscription.invoices)
        ? subscription.invoices.map((invoice: any) => this.mapInvoice(invoice))
        : [],
    } as BillingAdminSubscriptionType;
  }

  private mapPlan(plan: any): BillingAdminPlanType {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
    } as BillingAdminPlanType;
  }

  private mapInvoice(invoice: any): BillingAdminInvoiceType {
    return {
      id: invoice.id,
      amount_cents: invoice.amount_cents,
      status: invoice.status,
      issued_at: invoice.issued_at,
      number: invoice.number ?? null,
      pdf_url: invoice.pdf_url ?? null,
      stripe_invoice_id: invoice.stripe_invoice_id ?? null,
    } as BillingAdminInvoiceType;
  }

  private mapPayment(payment: any): BillingAdminPaymentType {
    return {
      id: payment.id,
      amount_cents: payment.amount_cents,
      status: payment.status,
      payment_method_type: payment.payment_method_type ?? null,
      receipt_url: payment.receipt_url ?? null,
      processed_at: payment.processed_at ?? null,
    } as BillingAdminPaymentType;
  }

  private normalizePlanCode(planCode: string | null | undefined): BillingPlanCode {
    if (
      planCode === BillingPlanCodeEnum.FREE ||
      planCode === BillingPlanCodeEnum.SOLO ||
      planCode === BillingPlanCodeEnum.PRO
    ) {
      return planCode;
    }
    this.logger.warn(`Unknown plan code "${planCode}" encountered while serializing admin billing data.`);
    return BillingPlanCodeEnum.FREE;
  }

  private normalizeBillingInterval(interval: string | null | undefined): BillingInterval {
    if (interval === BillingIntervalEnum.MONTH || interval === BillingIntervalEnum.YEAR) {
      return interval;
    }
    this.logger.warn(
      `Unknown billing interval "${interval}" encountered while serializing admin billing data.`,
    );
    return BillingIntervalEnum.MONTH;
  }
}
