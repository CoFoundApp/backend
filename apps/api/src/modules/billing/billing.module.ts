import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { QueueModule } from '../../infra/queue/queue.module';
import { EmailModule } from '../../infra/email/email.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingCatalogService } from './catalog/billing.catalog.service';
import { StripeService } from './stripe/stripe.service';
import { BillingCustomerService } from './billing-customer.service';
import { BillingWebhookService } from './billing-webhook.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingDunningService } from './billing-dunning.service';
import { BillingQueueProcessor } from './billing.queue.processor';
import { BillingAdminController } from './admin/billing-admin.controller';
import { BillingAdminService } from './admin/billing-admin.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PrismaModule, QueueModule, EmailModule],
  controllers: [BillingController, BillingAdminController],
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
  ],
  exports: [BillingService, BillingWebhookService, BillingCatalogService],
})
export class BillingModule {}
