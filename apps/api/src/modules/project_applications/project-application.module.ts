import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectApplicationResolver } from './project-application.resolver';
import { ProjectApplicationService } from './project-application.service';

@Module({
  providers: [ProjectApplicationResolver, ProjectApplicationService, PrismaService],
  exports: [ProjectApplicationService],
})
export class ProjectApplicationModule {}
