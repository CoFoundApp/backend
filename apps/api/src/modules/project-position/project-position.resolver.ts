import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ProjectPosition } from './project-position.type';
import { ProjectPositionService } from './project-position.service';
import { CreateProjectPositionInput } from './dto/create-project-position.input';

@Resolver(() => ProjectPosition)
export class ProjectPositionResolver {
  constructor(private readonly positions: ProjectPositionService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectPosition, { description: 'Créer une position de projet' })
  async createProjectPosition(
    @CurrentUser() user: JwtUser,
    @Args('input') input: CreateProjectPositionInput,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.positions.create(user.sub, input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [ProjectPosition], { description: 'Lister les positions d\'un projet' })
  async listProjectPositions(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.positions.list(user.sub, projectId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProjectPosition, { description: 'Clore une position de projet' })
  async closeProjectPosition(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.positions.close(user.sub, id);
  }
}
