import { Module } from '@nestjs/common';
import { QueueModule } from '../infra/queue/queue.module';
import { EmbeddingsProcessor } from './embeddings.processor';
import { JobsService } from './jobs.service';
import { JobsResolver } from './jobs.resolver';
import { EmbeddingModule } from '../modules/embedding/embedding.module';

@Module({
  imports: [QueueModule, EmbeddingModule],
  providers: [EmbeddingsProcessor, JobsService, JobsResolver],
  exports: [JobsService],
})
export class QueuesFeatureModule {}
