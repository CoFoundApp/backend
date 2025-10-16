import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { QueueModule } from '../../infra/queue/queue.module';
import { EmailModule } from '../../infra/email/email.module';
import { BillingService } from './billing.service';
import { BillingCatalogService } from './catalog/billing.catalog.service';
import { StripeService } from './stripe/stripe.service';
import { BillingCustomerService } from './billing-customer.service';
import { BillingWebhookService } from './billing-webhook.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingDunningService } from './billing-dunning.service';
import { BillingQueueProcessor } from './billing.queue.processor';
import { BillingAdminService } from './admin/billing-admin.service';
import { BillingResolver } from './billing.resolver';
import { BillingAdminResolver } from './admin/billing-admin.resolver';
import { RolesGuard } from '../auth/roles.guard';
import { BillingWebhookController } from './billing-webhook.controller';

@Module({
  imports: [PrismaModule, QueueModule, EmailModule],
  providers: [
    BillingService,
    BillingCatalogService,
    StripeService,
    BillingCustomerService,
    BillingWebhookService,
    BillingEntitlementsService,
    BillingInvoiceService,
    BillingDunningService,
    BillingQueueProcessor,
    BillingAdminService,
    RolesGuard,
    BillingResolver,
    BillingAdminResolver,
  ],
  exports: [BillingService, BillingWebhookService, BillingCatalogService],
  controllers: [BillingWebhookController],
})
export class BillingModule {}
