import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { MonitoringService } from './monitoring.service';

const STATUSES = ['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const;
const rawInterval = Number(process.env.METRICS_QUEUE_POLL_MS ?? 15000);
const POLL_INTERVAL = Number.isFinite(rawInterval) ? Math.max(5000, rawInterval) : 15000;

@Injectable()
export class QueueMetricsCollector implements OnModuleInit {
  private readonly logger = new Logger(QueueMetricsCollector.name);

  constructor(
    private readonly monitoring: MonitoringService,
    @InjectQueue('embeddings') private readonly embeddingsQueue: Queue,
    @InjectQueue('matching') private readonly matchingQueue: Queue,
  ) {}

  onModuleInit() {
    void this.collect();
  }

  @Interval(POLL_INTERVAL)
  async collect() {
    await Promise.all([
      this.collectForQueue('embeddings', this.embeddingsQueue),
      this.collectForQueue('matching', this.matchingQueue),
    ]);
  }

  private async collectForQueue(name: string, queue: Queue) {
    try {
      const counts = await queue.getJobCounts(...STATUSES);
      for (const status of STATUSES) {
        const value = counts[status] ?? 0;
        this.monitoring.recordQueueSize(name, status, value);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Unable to collect metrics for queue ${name}: ${err.message}`);
    }
  }
}
