import { Module } from '@nestjs/common';
import { QueueModule } from '../infra/queue/queue.module';
import { EmbeddingsProcessor } from './embeddings.processor';
import { JobsService } from './jobs.service';
import { JobsResolver } from './jobs.resolver';

@Module({
  imports: [QueueModule],
  providers: [EmbeddingsProcessor, JobsService, JobsResolver],
})
export class QueuesFeatureModule {}
