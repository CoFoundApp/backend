import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Project } from './project.type';
import { ProjectService } from './project.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { JobsService } from '../../queue/jobs.service';

@Resolver(() => Project)
export class ProjectResolver {
  constructor(
    private readonly projects: ProjectService,
    private readonly jobs: JobsService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => Project, { nullable: true, description: 'Récupérer un projet par ID' })
  async projectById(@CurrentUser() user: JwtUser, @Args('id', { type: () => String }) id: string) {
    if (!user) throw new UnauthorizedException();
    const p = await this.projects.findById(id);
    if (!p || p.owner_id !== user.sub) return null;
    return p;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Project], { description: 'Lister mes projets' })
  async listMyProjects(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.projects.listByOwner(user.sub);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, { description: 'Créer un projet' })
  async createProject(@CurrentUser() user: JwtUser, @Args('input') input: CreateProjectInput) {
    if (!user) throw new UnauthorizedException();
    const p = await this.projects.create(user.sub, input);
    await this.jobs.enqueueRecomputeProjectDebounced(p.id);
    return p;
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, { description: 'Mettre à jour un projet' })
  async updateProject(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateProjectInput,
  ) {
    if (!user) throw new UnauthorizedException();
    const p = await this.projects.update(id, user.sub, input);
    await this.jobs.enqueueRecomputeProjectDebounced(p.id);
    return p;
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: 'Supprimer un projet' })
  async deleteProject(@CurrentUser() user: JwtUser, @Args('id', { type: () => String }) id: string) {
    if (!user) throw new UnauthorizedException();
    return this.projects.delete(id, user.sub);
  }
}
