import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MatchingService } from './matching.service';
import { MatchingResolver } from './matching.resolver';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  providers: [PrismaService, MatchingService, MatchingResolver],
  exports: [MatchingService],
})
export class MatchingModule {}
