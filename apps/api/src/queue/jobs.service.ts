import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  constructor(@InjectQueue('embeddings') private readonly embeddingsQ: Queue) {}

  async enqueueRecomputeProfile(userId: string) {
    const jobId = `profile:${userId}`;
    const existing = await this.embeddingsQ.getJob(jobId);
    if (existing) {
      const st = await existing.getState();
      if (st !== 'active') await existing.remove();
      else return existing;
    }
    return this.embeddingsQ.add('recompute_profile', { userId }, { jobId, priority: 2 });
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

  async enqueueRecomputeProfileDebounced(userId: string, debounceMs = Number(process.env.EMBEDDINGS_DEBOUNCE_MS ?? 2000)) {
    const jobId = `profile:${userId}`;
    const existing = await this.embeddingsQ.getJob(jobId);
    if (existing) {
      const st = await existing.getState();
      if (st !== 'active') await existing.remove();
      else return existing;
    }
    return this.embeddingsQ.add('recompute_profile', { userId }, { jobId, priority: 2, delay: debounceMs });
  }

  counts() {
    return this.embeddingsQ.getJobCounts('waiting','active','delayed','completed','failed');
  }

  // État d’un job par id
  async getJobState(jobId: string) {
    const job = await this.embeddingsQ.getJob(jobId);
    if (!job) return null;
    return job.getState();
  }

  enqueueRecomputeProject(id: string) {
    return this.embeddingsQ.add('recompute_project', { id }, { jobId: `project:${id}`, priority: 3 });
  }

  async enqueueRecomputeProjectDebounced(id: string, debounceMs = Number(process.env.EMBEDDINGS_DEBOUNCE_MS ?? 2000)) {
    const jobId = `project:${id}`;
    const existing = await this.embeddingsQ.getJob(jobId);
    if (existing) {
      const st = await existing.getState();
      if (st !== 'active') await existing.remove();
      else return existing;
    }
    return this.embeddingsQ.add('recompute_project', { id }, { jobId, priority: 3, delay: debounceMs });
  }
}
