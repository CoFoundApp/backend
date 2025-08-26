import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ProfileEmbeddingService } from '../modules/embedding/profile-embedding.service';
import { EmbeddingService } from '../modules/embedding/embedding.service';

@Processor('embeddings')
export class EmbeddingsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsProcessor.name);

  constructor(
    private readonly profileEmb: ProfileEmbeddingService,
    private readonly embedSvc: EmbeddingService,
  ) {
    super();
  }

  onModuleInit() {
    this.logger.log('EmbeddingsProcessor ready (queue=embeddings)');
  }

  // Limiteur naïf: ~N req/s (free-tier friendly)
  private async rateLimitTick() {
    const max = Number(process.env.EMBEDDINGS_RATE_MAX ?? 8);
    const interval = 1000 / Math.max(1, max);
    await new Promise((r) => setTimeout(r, interval));
  }

  async process(job: Job): Promise<any> {
    await this.rateLimitTick();

    switch (job.name) {
      case 'recompute_profile': {
        const { userId } = job.data as { userId: string };
        const ok = await this.profileEmb.recomputeForUser(userId);
        return { ok, userId };
      }
      case 'recompute_skill': {
        const { id } = job.data as { id: string };
        const ok = await this.embedSvc.computeAndStoreForSkill(id);
        return { ok, id };
      }
      case 'recompute_interest': {
        const { id } = job.data as { id: string };
        const ok = await this.embedSvc.computeAndStoreForInterest(id);
        return { ok, id };
      }
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
        return { ignored: job.name };
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[embeddings] active #${job.id} ${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    this.logger.log(`[embeddings] completed #${job.id} ${JSON.stringify(result)}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(`[embeddings] failed #${job?.id}: ${err.message}`, err.stack);
  }
}
