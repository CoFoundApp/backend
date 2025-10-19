import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { MatchingService } from './matching.service';
import { MatchRecommendation } from './types/match-recommendation.type';
import { ProfileMatchConnection, ProjectMatchConnection } from './types/connection.input';
import { MatchExplanationConnection } from './types/match-explanation.type';
import { MatchExplanationFilterInput } from './types/match-explanation-filter.input';
import { MatchProfilesInput } from './types/match-profiles-input.type';
import { MatchProjectsInput } from './types/match-projects-input.type';
import { MatchDetailLevel } from './types/match-detail-level.enum';

@Resolver()
export class MatchingResolver {
  constructor(private readonly matching: MatchingService) {}

  // Suggestions de profils pour moi
  @UseGuards(SessionGuard)
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

  @UseGuards(SessionGuard)
  @Query(() => ProfileMatchConnection, { description: 'Matcher des profils selon divers critères' })
  async matchProfiles(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles(input);
  }

  @UseGuards(SessionGuard)
  @Query(() => ProfileMatchConnection, { description: 'Matching profil basique (scores + dimensions)' })
  async getBasicProfileMatches(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles({ ...input, detailLevel: MatchDetailLevel.BASIC });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProfileMatchConnection, { description: 'Matching enrichi avec explications' })
  async getEnrichedProfileMatches(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles({ ...input, detailLevel: MatchDetailLevel.ENRICHED });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProfileMatchConnection, { description: 'Matching avec analyse compétitive' })
  async getCompetitiveProfileMatches(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles({ ...input, detailLevel: MatchDetailLevel.COMPETITIVE });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProfileMatchConnection, { description: 'Matching bidirectionnel complet' })
  async getBidirectionalProfileMatches(@Args('input') input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    return this.matching.matchProfiles({ ...input, detailLevel: MatchDetailLevel.BIDIRECTIONAL });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectMatchConnection, { description: 'Matcher des projets selon divers critères' })
  async matchProjects(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects(input);
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectMatchConnection, { description: 'Matching projet basique (scores + dimensions)' })
  async getBasicProjectMatches(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects({ ...input, detailLevel: MatchDetailLevel.BASIC });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectMatchConnection, { description: 'Matching projet enrichi avec explications' })
  async getEnrichedProjectMatches(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects({ ...input, detailLevel: MatchDetailLevel.ENRICHED });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectMatchConnection, { description: 'Matching projet avec analyse compétitive' })
  async getCompetitiveProjectMatches(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects({ ...input, detailLevel: MatchDetailLevel.COMPETITIVE });
  }

  @UseGuards(SessionGuard)
  @Query(() => ProjectMatchConnection, { description: 'Matching projet bidirectionnel complet' })
  async getBidirectionalProjectMatches(@Args('input') input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    return this.matching.matchProjects({ ...input, detailLevel: MatchDetailLevel.BIDIRECTIONAL });
  }

  @UseGuards(SessionGuard)
  @Query(() => MatchExplanationConnection, { description: 'Historique des explications de matching' })
  async getMatchExplanations(
    @Args('filter', { type: () => MatchExplanationFilterInput, nullable: true }) filter?: MatchExplanationFilterInput,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
  ): Promise<MatchExplanationConnection> {
    return this.matching.listMatchExplanations(filter, limit ?? 50, cursor ?? undefined);
  }
}
