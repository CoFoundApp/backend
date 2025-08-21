import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { JobsService } from './jobs.service';

@Resolver()
export class JobsResolver {
  constructor(private readonly jobs: JobsService) {}

  @Mutation(() => String, { description: 'Enqueue embedding job (test)' })
  async enqueueEmbedding(
    @Args('profileId', { type: () => String }) profileId: string,
  ): Promise<string> {
    const job = await this.jobs.enqueueEmbedding(profileId);
    return `queued:${job.id}`;
  }
}
