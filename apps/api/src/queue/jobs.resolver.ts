import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../modules/auth/guards/gql-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { JobsService } from './jobs.service';

@Resolver()
export class JobsResolver {
  constructor(private readonly jobs: JobsService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeProfile(@Args('userId', { type: () => String }) userId: string) {
    return this.jobs.enqueueRecomputeProfile(userId).then(j => `queued:${j.id}`);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeSkill(@Args('id', { type: () => String }) id: string) {
    return this.jobs.enqueueRecomputeSkill(id).then(j => `queued:${j.id}`);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => String)
  adminEnqueueRecomputeInterest(@Args('id', { type: () => String }) id: string) {
    return this.jobs.enqueueRecomputeInterest(id).then(j => `queued:${j.id}`);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminEmbeddingQueueCounts() {
    return this.jobs.counts().then(c => JSON.stringify(c));
  }

  // Debug d’un job précis
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Query(() => String)
  adminEmbeddingJobState(@Args('jobId', { type: () => String }) jobId: string) {
    return this.jobs.getJobState(jobId).then(s => s ?? 'not-found');
  }
}
