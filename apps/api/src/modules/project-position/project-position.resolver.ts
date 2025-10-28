import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ProjectPosition } from './project-position.type';
import { ProjectPositionService } from './project-position.service';
import { CreateProjectPositionInput } from './dto/create-project-position.input';
import { AppError } from '../../common/errors/app-error.factory';

@Resolver(() => ProjectPosition)
export class ProjectPositionResolver {
  constructor(private readonly positions: ProjectPositionService) {}

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectPosition, { description: 'Créer une position de projet' })
  async createProjectPosition(
    @CurrentUser() user: JwtUser,
    @Args('input') input: CreateProjectPositionInput,
  ) {
    if (!user) throw AppError.unauthorized();
    return this.positions.create(user.sub, input);
  }

  @UseGuards(SessionGuard)
  @Query(() => [ProjectPosition], { description: 'Lister les positions d\'un projet' })
  async listProjectPositions(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
  ) {
    if (!user) throw AppError.unauthorized();
    return this.positions.list(user.sub, projectId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectPosition, { description: 'Clore une position de projet' })
  async closeProjectPosition(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw AppError.unauthorized();
    return this.positions.close(user.sub, id);
  }
}
