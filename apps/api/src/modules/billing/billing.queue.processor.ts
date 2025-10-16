import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BillingWebhookService } from './billing-webhook.service';
import { BillingDunningService, DunningJobPayload } from './billing-dunning.service';

@Processor('billing')
export class BillingQueueProcessor extends WorkerHost {
  constructor(
    private readonly webhookService: BillingWebhookService,
    private readonly dunningService: BillingDunningService,
  ) {
    super();
  }

  async process(job: Job<{ eventId: string } | DunningJobPayload>): Promise<void> {
    switch (job.name) {
      case 'process-event':
        await this.webhookService.processStoredEvent((job.data as { eventId: string }).eventId);
        break;
      case 'dunning-notify':
        await this.dunningService.handleDunningJob(job.data as DunningJobPayload);
        break;
      default:
        break;
    }
  }
}
