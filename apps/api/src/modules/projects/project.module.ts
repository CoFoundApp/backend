import { Module, forwardRef } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectResolver } from './project.resolver';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { QueuesFeatureModule } from '../../queue/queues.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    EmbeddingModule,
    QueuesFeatureModule,
  ],
  providers: [PrismaService, ProjectService, ProjectResolver],
  exports: [ProjectService],
})
export class ProjectModule {}
