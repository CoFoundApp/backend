import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  constructor(@InjectQueue('embeddings') private readonly embeddingsQ: Queue) {}

  async enqueueEmbedding(profileId: string) {
    return this.embeddingsQ.add('generate', { profileId }, { priority: 5 });
  }
}
