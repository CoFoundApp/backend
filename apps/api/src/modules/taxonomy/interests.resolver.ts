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
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

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

  // create
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Interest, { description: 'Créer un nouvel intérêt' })
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

  // Authenticated: set interests for the current user
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Replace current user interests with provided IDs',
  })
  async setMyInterests(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'interestIds', type: () => [String] }) interestIds: string[],
  ): Promise<boolean> {
    await this.interests.setForUser(user.sub, interestIds ?? []);
    await this.jobs.enqueueRecomputeProfile(user.sub);
    return true;
  }
}
