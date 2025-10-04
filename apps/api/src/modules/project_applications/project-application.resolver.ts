import { Resolver, Mutation, Args, Query, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import {
  ProjectApplication,
  ProjectApplicationList,
} from './project-application.type';
import { ProjectApplicationService } from './project-application.service';
import { ApplyProjectInput } from './dto/apply-project.input';
import { ApplicationStatus } from '../../common/enums/domain.enums';
import { UploadService } from '../upload/upload.service';
import { ProjectPosition } from '../project-position/project-position.type';
import { Project } from '../projects/project.type';
import { User } from '../user/user.type';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Resolver(() => ProjectApplication)
export class ProjectApplicationResolver {
  constructor(
    private readonly applications: ProjectApplicationService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectApplication, { description: 'Postuler à un projet' })
  async applyToProject(
    @CurrentUser() user: JwtUser,
    @Args('input') input: ApplyProjectInput,
  ) {
    if (!user) throw new UnauthorizedException();
        if (input.attachments?.length) {
      input.attachment_urls = await Promise.all(
        input.attachments.map((f) => this.uploadService.save(f)),
      );
    }
    return this.applications.apply(user.sub, input);
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectApplicationList, { description: 'Lister mes candidatures' })
  async myApplications(
    @CurrentUser() user: JwtUser,
    @Args('status', { type: () => ApplicationStatus, nullable: true })
    status?: ApplicationStatus,
    @Args('position_id', { type: () => String, nullable: true })
    positionId?: string,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.list(
      user.sub,
      status ?? undefined,
      positionId ?? undefined,
      cursor ?? undefined,
      limit ?? undefined,
    );
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectApplicationList, {
    description: 'Lister les candidatures d\'un projet (visible uniquement par les membres)'
  })
  async projectApplications(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('status', { type: () => ApplicationStatus, nullable: true })
    status?: ApplicationStatus,
    @Args('position_id', { type: () => String, nullable: true })
    positionId?: string,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    if (!user) throw new UnauthorizedException();

    return this.applications.listProjectApplications(
      projectId,
      user.sub,
      status ?? undefined,
      positionId ?? undefined,
      cursor ?? undefined,
      limit ?? 20,
    );
  }


  @UseGuards(SessionGuard)
  @Mutation(() => ProjectApplication, { description: 'Décider d\'une candidature à un projet' })
  async decideProjectApplication(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
    @Args('status', { type: () => ApplicationStatus }) status: ApplicationStatus,
    @Args('position_id', { type: () => String, nullable: true })
    positionId?: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.decide(user.sub, id, status, positionId ?? undefined);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectApplication, { description: 'Retirer une candidature à un projet' })
  async withdrawProjectApplication(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.withdraw(user.sub, id);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectApplication, { description: 'Annuler une candidature à un projet' })
  async cancelProjectApplication(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.cancel(user.sub, id);
  }

    @ResolveField(() => User)
  async applicant(@Parent() application: ProjectApplication) {
    return this.prisma.users.findUnique({
      where: { id: application.applicant_id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  // Field resolver pour "project"
  @ResolveField(() => Project)
  async project(@Parent() application: ProjectApplication) {
    return this.prisma.projects.findUnique({
      where: { id: application.project_id },
      select: {
        id: true,
        title: true,
        summary: true,
        banner_url: true,
        avatar_url: true,
        industry: true,
        stage: true,
        status: true,
      },
    });
  }

  // Field resolver pour "position"
  @ResolveField(() => ProjectPosition, { nullable: true })
  async position(@Parent() application: ProjectApplication) {
    if (!application.position_id) return null;

    return this.prisma.project_positions.findUnique({
      where: { id: application.position_id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
      },
    });
  }
}
