import { Module } from '@nestjs/common';
import { QueueModule } from '../infra/queue/queue.module';
import { EmbeddingsProcessor } from './embeddings.processor';
import { MatchingProcessor } from './matching.processor';
import { JobsService } from './jobs.service';
import { JobsResolver } from './jobs.resolver';
import { EmbeddingModule } from '../modules/embedding/embedding.module';
import { MatchingModule } from '../modules/matching/matching.module';

@Module({
  imports: [QueueModule, EmbeddingModule, MatchingModule],
  providers: [EmbeddingsProcessor, MatchingProcessor, JobsService, JobsResolver],
  exports: [JobsService],
})
export class QueuesFeatureModule {}
