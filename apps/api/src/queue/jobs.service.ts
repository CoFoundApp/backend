import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  constructor(@InjectQueue('embeddings') private readonly embeddingsQ: Queue) {}

  enqueueRecomputeProfile(userId: string) {
    return this.embeddingsQ.add('recompute_profile', { userId }, { jobId: `profile:${userId}`, priority: 2 });
  }
  enqueueRecomputeSkill(id: string) {
    return this.embeddingsQ.add('recompute_skill', { id }, { jobId: `skill:${id}`, priority: 3 });
  }
  enqueueRecomputeInterest(id: string) {
    return this.embeddingsQ.add('recompute_interest', { id }, { jobId: `interest:${id}`, priority: 3 });
  }
  enqueueProfilesBulk(userIds: string[]) {
    return this.embeddingsQ.addBulk(
      userIds.map((userId) => ({
        name: 'recompute_profile',
        data: { userId },
        opts: { jobId: `profile:${userId}`, priority: 2 },
      })),
    );
  }
}
