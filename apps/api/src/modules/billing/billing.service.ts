import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BillingCatalogService } from './catalog/billing.catalog.service';
import { BillingPlanCode, BillingPlanVariant } from './billing.types';
import { CreateCheckoutSessionInput } from './dto/create-checkout-session.input';
import { StripeService } from './stripe/stripe.service';
import { BillingCustomerService } from './billing-customer.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { CustomerPortalSessionInput } from './dto/customer-portal-session.input';
import { plan_interval, subscription_collection_method, subscription_status } from '@prisma/client';

interface CheckoutSessionResponse {
  mode: 'stripe_checkout' | 'immediate';
  sessionId?: string;
  url?: string;
  subscriptionId?: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BillingCatalogService,
    private readonly stripe: StripeService,
    private readonly customers: BillingCustomerService,
    private readonly entitlements: BillingEntitlementsService,
    private readonly config: ConfigService,
  ) {}

  getPublicCatalog() {
    return this.catalog.getPublicCatalog();
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionInput): Promise<CheckoutSessionResponse> {
    const variant = this.catalog.getVariant(dto.planCode, dto.interval);

    if (dto.planCode === 'free') {
      const subscription = await this.activateFreePlan(userId, dto.organizationId ?? null, variant);
      return {
        mode: 'immediate',
        subscriptionId: subscription.id,
      };
    }

    if (!variant.stripePriceId) {
      throw new BadRequestException(`Stripe price not configured for plan ${dto.planCode} (${dto.interval})`);
    }

    const billingCustomer = await this.customers.ensureForUser(userId, dto.organizationId ?? null);

    const successUrl = dto.successUrl ?? `${this.config.get('APP_BASE_URL') ?? 'https://cofound.example.com'}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl ?? `${this.config.get('APP_BASE_URL') ?? 'https://cofound.example.com'}/app/billing/cancel`;

    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'subscription',
      customer: billingCustomer.stripe_customer_id,
      customer_update: {
        address: 'auto',
        shipping: 'auto',
        name: 'auto',
      },
      payment_method_types: ['card', 'sepa_debit'],
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      discounts: dto.promotionCode ? [{ promotion_code: dto.promotionCode }] : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      locale: 'fr',
      tax_id_collection: { enabled: true },
      metadata: {
        user_id: userId,
        plan_code: dto.planCode,
        interval: dto.interval,
        organization_id: dto.organizationId ?? undefined,
      },
      line_items: [
        {
          price: variant.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: variant.trialDays ?? undefined,
        proration_behavior: 'create_prorations',
        metadata: {
          user_id: userId,
          plan_code: dto.planCode,
          interval: dto.interval,
          organization_id: dto.organizationId ?? undefined,
        },
      },
    });

    return {
      mode: 'stripe_checkout',
      sessionId: session.id,
      url: session.url ?? undefined,
    };
  }

  async createCustomerPortalSession(userId: string, dto: CustomerPortalSessionInput) {
    const billingCustomer = await this.prisma.billing_customers.findFirst({
      where: { user_id: userId },
    });
    if (!billingCustomer) {
      throw new NotFoundException('Aucun client Stripe lié au compte.');
    }

    const returnUrl = dto.returnUrl ?? this.config.get('STRIPE_BILLING_PORTAL_RETURN_URL');

    const session = await this.stripe.client.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: returnUrl ?? undefined,
      flow_data: {
        type: 'payment_method_update',
      },
    });

    return { url: session.url };
  }

  async getLatestSubscriptionForUser(userId: string) {
    return this.prisma.subscriptions.findFirst({
      where: { user_id: userId },
      orderBy: { started_at: 'desc' },
    });
  }

  private async activateFreePlan(userId: string, organizationId: string | null, variant: BillingPlanVariant) {
    const plan = await this.prisma.plans.findUnique({ where: { code: variant.planCodeForDatabase } });
    if (!plan) {
      throw new NotFoundException(`Plan ${variant.planCodeForDatabase} introuvable`);
    }

    const billingCustomer = await this.customers.ensureForUser(userId, organizationId);

    const existing = await this.prisma.subscriptions.findFirst({
      where: { user_id: userId },
      orderBy: { started_at: 'desc' },
    });

    if (existing) {
      const updated = await this.prisma.subscriptions.update({
        where: { id: existing.id },
        data: {
          plan_id: plan.id,
          plan_code: variant.plan.code,
          billing_interval: plan_interval.month,
          billing_customer_id: billingCustomer.id,
          organization_id: organizationId ?? undefined,
          status: subscription_status.active,
          collection_method: subscription_collection_method.charge_automatically,
          external_subscription_id: null,
          external_customer_id: billingCustomer.stripe_customer_id,
          trial_start: null,
          trial_end: null,
          cancel_at: null,
          canceled_at: null,
        },
      });
      await this.entitlements.syncForSubscription(updated.id, variant.plan.code as BillingPlanCode);
      return updated;
    }

    const created = await this.prisma.subscriptions.create({
      data: {
        user_id: userId,
        plan_id: plan.id,
        plan_code: variant.plan.code,
        billing_interval: plan_interval.month,
        billing_customer_id: billingCustomer.id,
        organization_id: organizationId ?? undefined,
        status: subscription_status.active,
        seats: 1,
        collection_method: subscription_collection_method.charge_automatically,
        external_customer_id: billingCustomer.stripe_customer_id,
      },
    });
    await this.entitlements.syncForSubscription(created.id, variant.plan.code as BillingPlanCode);
    return created;
  }
}
