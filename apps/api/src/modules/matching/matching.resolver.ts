import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { MatchingService } from './matching.service';
import { MatchRecommendation } from './types/match-recommendation.type';
import { ProfileMatchConnection, ProjectMatchConnection } from './types/connection.input'
import { MatchProfilesInput } from './types/match-profiles-input.type';
import { MatchProjectsInput } from './types/match-projects-input.type';

@Resolver()
export class MatchingResolver {
  constructor(private readonly matching: MatchingService) {}

  // Suggestions de profils pour moi
  @UseGuards(GqlAuthGuard)
  @Query(() => [MatchRecommendation], { description: 'Suggestions de profils pour moi (hybride sémantique + métier)' })
  async suggestProfilesForMe(
    @CurrentUser() user: JwtUser,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit?: number,
    @Args('preselect', { type: () => Int, nullable: true, defaultValue: 200 }) preselect?: number,
    @Args('maxDistance', { type: () => Number, nullable: true, defaultValue: 0.4 }) maxDistance?: number,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.matching.suggestProfilesForUser(user.sub, limit ?? 20, preselect ?? 200, maxDistance ?? 0.4);
  }

  @Query(() => ProfileMatchConnection)
  async matchProfiles(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles(input);
  }

  @Query(() => ProjectMatchConnection)
  async matchProjects(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects(input);
  }
}
