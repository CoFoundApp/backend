import { Resolver, Query, Mutation, Args, Float, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Project } from './project.type';
import { ProjectService } from './project.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { JobsService } from '../../queue/jobs.service';
import { ProjectSearchHit } from './project-search-hit.type';
import { UploadService } from '../upload/upload.service';
import { ProjectListFiltersInput, ProjectListPageInput, ProjectListResult, ProjectListSortInput } from './dto/project-list.input';
import { mapProjectRowToGql } from './project.service';

@Resolver(() => Project)
export class ProjectResolver {
  constructor(
    private readonly projects: ProjectService,
    private readonly jobs: JobsService,
    private readonly uploads: UploadService,
  ) {}

  @UseGuards(SessionGuard)
  @Query(() => Project, { nullable: true, description: 'Récupérer un projet par ID avec skills et interests' })
  async projectById(@CurrentUser() user: JwtUser, @Args('id', { type: () => String }) id: string) {
    if (!user) throw new UnauthorizedException();
    const p = await this.projects.findById(id);
    if (!p || p.owner_id !== user.sub) return null;
    return mapProjectRowToGql(p);
  }

  @UseGuards(SessionGuard)
  @Query(() => [Project], { description: 'Lister mes projets avec skills et interests' })
  async listMyProjects(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    const projects = await this.projects.listByOwner(user.sub);
    return projects.map(mapProjectRowToGql);
  }

  @Query(() => ProjectListResult, { description: 'Lister des projets avec filtres/tri/pagination (sans recherche texte)' })
  async listProjects(
    @Args('filters', { type: () => ProjectListFiltersInput, nullable: true }) filters?: ProjectListFiltersInput,
    @Args('sort', { type: () => ProjectListSortInput, nullable: true }) sort?: ProjectListSortInput,
    @Args('page', { type: () => ProjectListPageInput, nullable: true }) page?: ProjectListPageInput,
  ): Promise<ProjectListResult> {
    const p = page ?? { page: 1, pageSize: 20 };
    return this.projects.listProjects(filters, sort, p);
  }

  @Query(() => [ProjectSearchHit], { description: 'Recherche de projets (BM25 + vector)' })
  async searchProjects(
    @Args('q', { type: () => String }) q: string,
    @Args('embedding', { type: () => [Float], nullable: true }) embedding?: number[],
    @Args('k', { type: () => Int, nullable: true, defaultValue: 20 }) k?: number,
  ) {
    return this.projects.searchProjects(q, embedding, k ?? 20);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Project, { description: 'Créer un projet' })
  async createProject(@CurrentUser() user: JwtUser, @Args('input') input: CreateProjectInput) {
    if (!user) throw new UnauthorizedException();
    if (input.attachments?.length) {
      input.attachment_urls = await Promise.all(
        input.attachments.map((f) => this.uploads.save(f)),
      );
    }
    if (input.banner) {
      input.banner_url = await this.uploads.save(input.banner);
    }
    if (input.avatar) {
      input.avatar_url = await this.uploads.save(input.avatar);
    }
    const p = await this.projects.create(user.sub, input);
    await this.jobs.enqueueRecomputeProjectDebounced(p.id);
    return p;
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Project, { description: 'Mettre à jour un projet' })
  async updateProject(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateProjectInput,
  ) {
    if (!user) throw new UnauthorizedException();
    if (input.attachments?.length) {
      input.attachment_urls = await Promise.all(
        input.attachments.map((f) => this.uploads.save(f)),
      );
    }
    if (input.banner) {
      input.banner_url = await this.uploads.save(input.banner);
    }
    if (input.avatar) {
      input.avatar_url = await this.uploads.save(input.avatar);
    }
    const p = await this.projects.update(id, user.sub, input);
    await this.jobs.enqueueRecomputeProjectDebounced(p.id);
    return p;
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Supprimer un projet' })
  async deleteProject(@CurrentUser() user: JwtUser, @Args('id', { type: () => String }) id: string) {
    if (!user) throw new UnauthorizedException();
    return this.projects.delete(id, user.sub);
  }
}
