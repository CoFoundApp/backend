import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { InterestsService } from './interests.service';
import { Interest } from './types/interest.type';
import { CreateInterestInput } from './dto/create-interest.input';
import { ListArgs } from './dto/list.args';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JobsService } from '../../queue/jobs.service';

@Resolver(() => Interest)
export class InterestsResolver {
  constructor(
    private readonly interests: InterestsService,
    private readonly jobs: JobsService
  ) {}

  // Public list
  @Query(() => [Interest], { description: 'Public: list interests (page.items)' })
  async listInterests(@Args() args: ListArgs) {
    const page = await this.interests.listInterests(args);
    return page.items;
  }

  // Public: list interests next cursor
  @Query(() => String, { nullable: true, description: 'Public: list interests next cursor' })
  async listInterestsNextCursor(@Args() args: ListArgs) {
    const page = await this.interests.listInterests(args);
    return page.nextCursor ?? null;
  }

  // Admin create
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Interest)
  async createInterest(@Args('input') input: CreateInterestInput) {
    return this.interests.adminCreateInterest(input);
  }

  // Admin set user interests by slugs
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, {
    description:
      'Admin: set user interests by slugs and enqueue profile embedding recompute',
  })
  async adminSetUserInterestsBySlugs(
    @Args('userId', { type: () => String }) userId: string,
    @Args({ name: 'addSlugs', type: () => [String], nullable: true })
    addSlugs?: string[],
    @Args({ name: 'removeSlugs', type: () => [String], nullable: true })
    removeSlugs?: string[],
  ): Promise<boolean> {
    await this.interests.setBySlugs(userId, addSlugs ?? [], removeSlugs ?? []);
    await this.jobs.enqueueRecomputeProfile(userId);
    return true;
  }
}
