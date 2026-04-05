import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AssistantService } from './assistant.service';
import { AssistantResolver } from './assistant.resolver';

@Module({
  imports: [PrismaModule, EmbeddingModule],
  providers: [AssistantService, AssistantResolver],
  exports: [AssistantService],
})
export class AssistantModule {}
