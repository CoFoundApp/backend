import { Module } from '@nestjs/common';
import { ProjectMemberResolver } from './project-member.resolver';
import { ProjectMemberService } from './project-member.service';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProjectMemberResolver, ProjectMemberService],
})
export class ProjectMemberModule {}
