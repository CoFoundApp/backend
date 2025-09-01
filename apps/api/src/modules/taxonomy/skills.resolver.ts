import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SkillsService } from './skills.service';
import { Skill } from './types/skill.type';
import { CreateSkillInput } from './dto/create-skill.input';
import { ListArgs } from './dto/list.args';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JobsService } from '../../queue/jobs.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';


@Resolver(() => Skill)
export class SkillsResolver {
  constructor(
    private readonly skills: SkillsService,
    private readonly jobs: JobsService,
  ) {}

  // Public list
  @Query(() => [Skill], { description: 'Public: list skills (page.items)' })
  async listSkills(@Args() args: ListArgs) {
    const page = await this.skills.listSkills(args);
    return page.items;
  }

  // Public: pour récupérer le nextCursor
  @Query(() => String, { nullable: true, description: 'Public: list skills next cursor' })
  async listSkillsNextCursor(@Args() args: ListArgs) {
    const page = await this.skills.listSkills(args);
    return page.nextCursor ?? null;
  }

  // Admin create
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Skill, { description: 'Créer un nouvel skill' })
  async createSkill(@Args('input') input: CreateSkillInput) {
    return this.skills.adminCreateSkill(input);
  }

  // Admin set user skills
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, { description: 'Admin: set user skills by IDs' })
  adminSetUserSkills(
    @Args('userId', { type: () => String }) userId: string,
    @Args({ name: 'addIds', type: () => [String], nullable: true }) addIds?: string[],
    @Args({ name: 'removeIds', type: () => [String], nullable: true }) removeIds?: string[],
  ) {
    return this.skills.attachToUser(userId, addIds ?? [], removeIds ?? []).then(() => true);
  }

  // Admin set user skills by slugs and enqueue profile embedding recompute
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, {
    description:
      'Admin: set user skills by slugs and enqueue profile embedding recompute',
  })
  async adminSetUserSkillsBySlugs(
    @Args('userId', { type: () => String }) userId: string,
    @Args({ name: 'addSlugs', type: () => [String], nullable: true })
    addSlugs?: string[],
    @Args({ name: 'removeSlugs', type: () => [String], nullable: true })
    removeSlugs?: string[],
  ): Promise<boolean> {
    await this.skills.setBySlugs(userId, addSlugs ?? [], removeSlugs ?? []);
    await this.jobs.enqueueRecomputeProfile(userId);
    return true;
  }

  // Authenticated: set skills for the current user
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Replace current user skills with provided IDs',
  })
  async setMySkills(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'skillIds', type: () => [String] }) skillIds: string[],
  ): Promise<boolean> {
    await this.skills.setForUser(user.sub, skillIds ?? []);
    await this.jobs.enqueueRecomputeProfile(user.sub);
    return true;
  }
}
