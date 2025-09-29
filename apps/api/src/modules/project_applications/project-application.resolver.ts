import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
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

@Resolver(() => ProjectApplication)
export class ProjectApplicationResolver {
  constructor(
    private readonly applications: ProjectApplicationService,
    private readonly uploadService: UploadService,
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
  @Query(() => ProjectApplicationList, { description: 'Lister mes candidatures à un projet' })
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
    return this.applications.list(
      user.sub,
      projectId,
      status ?? undefined,
      positionId ?? undefined,
      cursor ?? undefined,
      limit ?? undefined,
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
}
