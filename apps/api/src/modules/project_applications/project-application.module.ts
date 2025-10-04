import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectApplicationResolver } from './project-application.resolver';
import { ProjectApplicationService } from './project-application.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  providers: [ProjectApplicationResolver, ProjectApplicationService, PrismaService],
  exports: [ProjectApplicationService],
})
export class ProjectApplicationModule {}
