import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: redisUrl },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    BullModule.registerQueue(
      { name: 'embeddings' },
      { name: 'emails' },
      { name: 'notifications' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
