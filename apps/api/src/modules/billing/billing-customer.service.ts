import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StripeService } from './stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { StripeCustomer } from './stripe/stripe.types';

@Injectable()
export class BillingCustomerService {
  private readonly logger = new Logger(BillingCustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async ensureForUser(userId: string, organizationId?: string | null) {
    const existing = await this.prisma.billing_customers.findFirst({
      where: {
        user_id: userId,
        ...(organizationId ? { organization_id: organizationId } : { organization_id: null }),
      },
    });
    if (existing) return existing;

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { profiles: true },
    });
    if (!user) {
      throw new Error(`User ${userId} not found when creating Stripe customer`);
    }

    const organization = organizationId
      ? await this.prisma.organizations.findUnique({ where: { id: organizationId } })
      : null;

    const email = organization?.billing_email ?? user.email;
    const name = organization?.legal_name ?? user.profiles?.display_name ?? user.email;

    const customer = await this.stripe.client.customers.create({
      email,
      name: name ?? undefined,
      metadata: {
        user_id: userId,
        organization_id: organizationId ?? undefined,
      },
      address: organization?.address as any,
      preferred_locales: ['fr-FR', 'en-US'],
      invoice_settings: {
        footer: this.config.get('BILLING_INVOICE_FOOTER') ?? undefined,
      },
    });

    return this.upsertFromStripe(customer, { userId, organizationId: organizationId ?? undefined });
  }

  async upsertFromStripe(customer: StripeCustomer, context?: { userId?: string; organizationId?: string }) {
    const vatValid = Array.isArray(customer.tax_ids?.data)
      ? customer.tax_ids.data.some(tax => tax.verification?.status === 'verified')
      : false;

    return this.prisma.billing_customers.upsert({
      where: { stripe_customer_id: customer.id },
      update: {
        email: customer.email ?? undefined,
        name: customer.name ?? undefined,
        phone: customer.phone ?? undefined,
        locale: customer.preferred_locales?.[0] ?? undefined,
        tax_exemption: customer.tax_exempt ?? undefined,
        vat_number: customer.tax_ids?.data?.find(id => id.type === 'eu_vat')?.value ?? undefined,
        vat_valid: vatValid,
        billing_address: customer.address ?? undefined,
        shipping_address: (customer.shipping?.address as any) ?? undefined,
        metadata: customer.metadata as any,
        user_id: context?.userId ?? (typeof customer.metadata?.user_id === 'string' ? customer.metadata.user_id : undefined),
        organization_id:
          context?.organizationId ?? (typeof customer.metadata?.organization_id === 'string' ? customer.metadata.organization_id : undefined),
      },
      create: {
        stripe_customer_id: customer.id,
        email: (customer.email ?? '') as string,
        name: customer.name ?? undefined,
        phone: customer.phone ?? undefined,
        locale: customer.preferred_locales?.[0] ?? 'fr',
        tax_exemption: customer.tax_exempt ?? undefined,
        vat_number: customer.tax_ids?.data?.find(id => id.type === 'eu_vat')?.value ?? undefined,
        vat_valid: vatValid,
        billing_address: customer.address ?? undefined,
        shipping_address: (customer.shipping?.address as any) ?? undefined,
        metadata: customer.metadata as any,
        user_id: context?.userId ?? (typeof customer.metadata?.user_id === 'string' ? customer.metadata.user_id : undefined) ?? null,
        organization_id:
          context?.organizationId ?? (typeof customer.metadata?.organization_id === 'string' ? customer.metadata.organization_id : undefined) ?? null,
      },
    });
  }

  async refreshFromStripe(stripeCustomerId: string) {
    const customer = await this.stripe.client.customers.retrieve(stripeCustomerId, {
      expand: ['tax_ids'],
    });
    if ((customer as any).deleted) {
      this.logger.warn(`Stripe customer ${stripeCustomerId} is deleted`);
      return null;
    }
    return this.upsertFromStripe(customer as StripeCustomer);
  }
}
