import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SkillsService } from './skills.service';
import { Skill } from './types/skill.type';
import { CreateSkillInput } from './dto/create-skill.input';
import { ListArgs } from './dto/list.args';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Resolver(() => Skill)
export class SkillsResolver {
  constructor(private readonly skills: SkillsService) {}

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
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Skill)
  async createSkill(@Args('input') input: CreateSkillInput) {
    return this.skills.adminCreateSkill(input);
  }
}
