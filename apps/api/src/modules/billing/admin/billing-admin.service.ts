import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { BillingWebhookService } from '../billing-webhook.service';
import { BillingEntitlementsService } from '../billing-entitlements.service';
import { BillingPlanCode } from '../billing.types';

@Injectable()
export class BillingAdminService {
  private readonly logger = new Logger(BillingAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: BillingWebhookService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async listCustomers() {
    return this.prisma.billing_customers.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        subscriptions: {
          orderBy: { started_at: 'desc' },
          take: 1,
          include: {
            plans: true,
            invoices: { orderBy: { issued_at: 'desc' }, take: 5 },
          },
        },
        invoices: { orderBy: { issued_at: 'desc' }, take: 5 },
        payments: { orderBy: { processed_at: 'desc' }, take: 3 },
        organization: true,
        user: { select: { email: true, profiles: { select: { display_name: true } } } },
      },
    });
  }

  async forceSyncCustomer(stripeCustomerId: string) {
    const customer = await this.webhook.syncCustomer(stripeCustomerId);
    return customer;
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
      throw new ForbiddenException('Invoice sequence regeneration is read-only in production');
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
}
