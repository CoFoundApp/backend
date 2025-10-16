import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MatchingService } from '../modules/matching/matching.service';
import { MatchDetailLevel } from '../modules/matching/types/match-detail-level.enum';
import { MonitoringService } from '../modules/monitoring/monitoring.service';

interface PrecomputeProfileJob {
  profileId?: string;
  detailLevel?: MatchDetailLevel | string | null;
  limit?: number | null;
}

interface PrecomputeProjectJob {
  projectId?: string;
  detailLevel?: MatchDetailLevel | string | null;
  limit?: number | null;
}

function normaliseDetailLevel(level?: MatchDetailLevel | string | null): MatchDetailLevel {
  if (!level) return MatchDetailLevel.ENRICHED;
  const candidate = typeof level === 'string' ? level.toUpperCase() : level;
  return (MatchDetailLevel as any)[candidate] ?? MatchDetailLevel.ENRICHED;
}

function normaliseLimit(value?: number | null, fallback = 20): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

@Processor('matching')
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly matching: MatchingService,
    private readonly monitoring: MonitoringService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'precompute_profile_matches': {
        const data = job.data as PrecomputeProfileJob;
        if (!data.profileId) {
          return { skipped: 'missing-profile-id' };
        }
        const detailLevel = normaliseDetailLevel(data.detailLevel);
        const limit = normaliseLimit(data.limit);
        const count = await this.matching.precomputeProjectMatchesForProfile(
          data.profileId,
          detailLevel,
          limit,
        );
        return { profileId: data.profileId, detailLevel, computed: count };
      }
      case 'precompute_project_matches': {
        const data = job.data as PrecomputeProjectJob;
        if (!data.projectId) {
          return { skipped: 'missing-project-id' };
        }
        const detailLevel = normaliseDetailLevel(data.detailLevel);
        const limit = normaliseLimit(data.limit);
        const count = await this.matching.precomputeProfileMatchesForProject(
          data.projectId,
          detailLevel,
          limit,
        );
        return { projectId: data.projectId, detailLevel, computed: count };
      }
      default:
        this.logger.warn(`Unknown matching job: ${job.name}`);
        return { ignored: job.name };
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[matching] active #${job.id} ${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    this.logger.log(`[matching] completed #${job.id} ${JSON.stringify(result)}`);
    const durationSeconds =
      job.finishedOn && job.processedOn
        ? Math.max(0, (job.finishedOn - job.processedOn) / 1000)
        : undefined;
    this.monitoring.recordQueueJobProcessed('matching', job.name, durationSeconds);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(`[matching] failed #${job?.id}: ${err.message}`, err.stack);
    this.monitoring.recordQueueJobFailed('matching', job?.name ?? 'unknown');
  }
}
