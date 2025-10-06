import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SessionGuard } from '../modules/auth/guards/session.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { JobsService } from './jobs.service';
import { MatchDetailLevel } from '../modules/matching/types/match-detail-level.enum';

@Resolver()
export class JobsResolver {
  constructor(private readonly jobs: JobsService) {}

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeProfile(@Args('userId', { type: () => String }) userId: string) {
    return this.jobs.enqueueRecomputeProfile(userId).then(j => `queued:${j.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeSkill(@Args('id', { type: () => String }) id: string) {
    return this.jobs.enqueueRecomputeSkill(id).then(j => `queued:${j.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeInterest(@Args('id', { type: () => String }) id: string) {
    return this.jobs.enqueueRecomputeInterest(id).then(j => `queued:${j.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminEmbeddingQueueCounts() {
    return this.jobs.counts().then(c => JSON.stringify(c));
  }

  // Debug d’un job précis
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminEmbeddingJobState(@Args('jobId', { type: () => String }) jobId: string) {
    return this.jobs.getJobState(jobId).then(s => s ?? 'not-found');
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeProject(@Args('id', { type: () => String }) id: string) {
    return this.jobs.enqueueRecomputeProject(id).then(j => `queued:${j.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminPrecomputeProfileMatches(
    @Args('profileId', { type: () => String }) profileId: string,
    @Args('detailLevel', { type: () => MatchDetailLevel, nullable: true }) detailLevel?: MatchDetailLevel,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    return this.jobs
      .enqueuePrecomputeProfileMatches(profileId, detailLevel ?? MatchDetailLevel.ENRICHED, limit ?? 20)
      .then((job) => `queued:${job.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminPrecomputeProjectMatches(
    @Args('projectId', { type: () => String }) projectId: string,
    @Args('detailLevel', { type: () => MatchDetailLevel, nullable: true }) detailLevel?: MatchDetailLevel,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    return this.jobs
      .enqueuePrecomputeProjectMatches(projectId, detailLevel ?? MatchDetailLevel.ENRICHED, limit ?? 20)
      .then((job) => `queued:${job.id}`);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminMatchingQueueCounts() {
    return this.jobs.matchingCounts().then((counts) => JSON.stringify(counts));
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminMatchingJobState(@Args('jobId', { type: () => String }) jobId: string) {
    return this.jobs.getMatchingJobState(jobId).then((state) => state ?? 'not-found');
  }
}
