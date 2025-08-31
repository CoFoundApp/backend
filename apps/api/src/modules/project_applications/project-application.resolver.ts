import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import {
  ProjectApplication,
  ProjectApplicationList,
} from './project-application.type';
import { ProjectApplicationService } from './project-application.service';
import { ApplyProjectInput } from './dto/apply-project.input';
import { ApplicationStatus } from '../../common/enums/domain.enums';

@Resolver(() => ProjectApplication)
export class ProjectApplicationResolver {
  constructor(private readonly applications: ProjectApplicationService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectApplication)
  async applyToProject(
    @CurrentUser() user: JwtUser,
    @Args('input') input: ApplyProjectInput,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.apply(user.sub, input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProjectApplicationList)
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

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectApplication)
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

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectApplication)
  async withdrawProjectApplication(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.withdraw(user.sub, id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectApplication)
  async cancelProjectApplication(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.applications.cancel(user.sub, id);
  }
}
