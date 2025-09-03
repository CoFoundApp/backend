import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectPositionResolver } from './project-position.resolver';
import { ProjectPositionService } from './project-position.service';

@Module({
  providers: [ProjectPositionResolver, ProjectPositionService, PrismaService],
  exports: [ProjectPositionService],
})
export class ProjectPositionModule {}
