import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StripeInvoice } from './stripe/stripe.types';
import { StripeService } from './stripe/stripe.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { subscription_status } from '@prisma/client';

const DUNNING_STEPS = [
  { attempt: 1, delayHours: 6 },
  { attempt: 2, delayHours: 24 },
  { attempt: 3, delayHours: 72 },
];

export interface DunningJobPayload {
  invoiceId: string;
  subscriptionId: string;
  attempt: number;
}

@Injectable()
export class BillingDunningService {
  private readonly logger = new Logger(BillingDunningService.name);

  constructor(
    @InjectQueue('billing') private readonly queue: Queue,
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly mailer: TemplateMailerService,
  ) {}

  async schedule(invoice: StripeInvoice, subscriptionId: string) {
    for (const step of DUNNING_STEPS) {
      await this.queue.add(
        'dunning-notify',
        { invoiceId: invoice.id, subscriptionId, attempt: step.attempt } satisfies DunningJobPayload,
        {
          jobId: `dunning:${invoice.id}:${step.attempt}`,
          delay: step.delayHours * 60 * 60 * 1000,
          removeOnComplete: true,
        },
      );
    }
  }

  async handleDunningJob(payload: DunningJobPayload) {
    const invoice = await this.stripe.client.invoices.retrieve(payload.invoiceId, {
      expand: ['customer', 'subscription'],
    });
    if (invoice.status === 'paid' || invoice.status === 'void') {
      this.logger.log(`Skipping dunning for ${payload.invoiceId}, status=${invoice.status}`);
      return;
    }

    const billingCustomer = await this.prisma.billing_customers.findFirst({
      where: { stripe_customer_id: invoice.customer as string },
      include: { user: true },
    });

    const email = (invoice.customer_email ?? billingCustomer?.email) ?? billingCustomer?.user?.email;
    if (email) {
      await this.mailer.sendTemplate(email, 'billing-dunning', 'fr', {
        amount: (invoice.amount_due ?? 0) / 100,
        currency: (invoice.currency ?? 'eur').toUpperCase(),
        invoice_url: invoice.hosted_invoice_url,
        attempt: payload.attempt,
      });
    }

    if (payload.attempt >= DUNNING_STEPS[DUNNING_STEPS.length - 1].attempt && invoice.subscription) {
      await this.stripe.client.subscriptions.update(invoice.subscription as string, {
        cancel_at_period_end: true,
      });
      const subscription = await this.prisma.subscriptions.findFirst({
        where: { external_subscription_id: invoice.subscription as string },
      });
      if (subscription) {
        await this.prisma.subscriptions.update({
          where: { id: subscription.id },
          data: {
            status: subscription_status.past_due,
            cancel_at: new Date(),
            ended_reason: 'dunning_final_failure',
          },
        });
      }
    }
  }
}
