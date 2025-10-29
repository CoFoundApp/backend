import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error.factory';
import { AppException } from '../../common/errors/app-exception';
import { CounterMetric, GaugeMetric, HistogramMetric } from './metrics';

type MatchingStatus = 'success' | 'error';

@Injectable()
export class MonitoringService {
  private readonly matchingRequests = new CounterMetric(
    'cofound_matching_requests_total',
    'Total number of matching requests handled by the API',
    ['target', 'mode', 'detail_level', 'status'],
  );

  private readonly matchingDurations = new HistogramMetric(
    'cofound_matching_duration_seconds',
    'Distribution of matching execution time in seconds',
    ['target', 'mode'],
    [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20],
  );

  private readonly matchingResults = new HistogramMetric(
    'cofound_matching_results_returned',
    'Number of items returned by the matching service',
    ['target', 'mode'],
    [0, 5, 10, 20, 50, 100],
  );

  private readonly queueSizes = new GaugeMetric(
    'cofound_queue_jobs',
    'Current number of jobs per queue and status',
    ['queue', 'status'],
  );

  private readonly queueProcessed = new CounterMetric(
    'cofound_queue_jobs_processed_total',
    'Total number of processed jobs per queue and job name',
    ['queue', 'job', 'status'],
  );

  private readonly queueDurations = new HistogramMetric(
    'cofound_queue_job_duration_seconds',
    'Observed duration of completed queue jobs',
    ['queue', 'job'],
    [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 15, 30, 60],
  );

  private readonly userTotals = new GaugeMetric(
    'cofound_kpi_users_total',
    'Total number of user accounts',
    [],
  );

  private readonly userVerifiedTotals = new GaugeMetric(
    'cofound_kpi_users_verified_total',
    'Total number of users with a verified email address',
    [],
  );

  private readonly userStatusTotals = new GaugeMetric(
    'cofound_kpi_users_by_status',
    'Number of users by status',
    ['status'],
  );

  private readonly profileTotals = new GaugeMetric(
    'cofound_kpi_profiles_total',
    'Total number of profiles',
    [],
  );

  private readonly profileVisibilityTotals = new GaugeMetric(
    'cofound_kpi_profiles_by_visibility',
    'Number of profiles by visibility',
    ['visibility'],
  );

  private readonly profileCompletedTotals = new GaugeMetric(
    'cofound_kpi_profiles_completed_total',
    'Number of profiles with display name, headline and bio filled',
    [],
  );

  private readonly profileAvatarTotals = new GaugeMetric(
    'cofound_kpi_profiles_with_avatar_total',
    'Number of profiles that have an avatar set',
    [],
  );

  private readonly profileBioTotals = new GaugeMetric(
    'cofound_kpi_profiles_with_bio_total',
    'Number of profiles that have a bio filled',
    [],
  );

  private readonly projectTotals = new GaugeMetric(
    'cofound_kpi_projects_total',
    'Total number of projects',
    [],
  );

  private readonly projectStatusTotals = new GaugeMetric(
    'cofound_kpi_projects_by_status',
    'Number of projects by status',
    ['status'],
  );

  private readonly projectVisibilityTotals = new GaugeMetric(
    'cofound_kpi_projects_by_visibility',
    'Number of projects by visibility',
    ['visibility'],
  );

  private readonly projectPositionTotals = new GaugeMetric(
    'cofound_kpi_project_positions_by_status',
    'Number of project positions by status',
    ['status'],
  );

  private readonly projectMemberTotals = new GaugeMetric(
    'cofound_kpi_project_members_total',
    'Total number of project memberships',
    [],
  );

  private readonly projectMemberStatusTotals = new GaugeMetric(
    'cofound_kpi_project_members_by_status',
    'Number of project memberships by status',
    ['status'],
  );

  private readonly projectApplicationTotals = new GaugeMetric(
    'cofound_kpi_project_applications_total',
    'Total number of project applications',
    [],
  );

  private readonly projectApplicationStatusTotals = new GaugeMetric(
    'cofound_kpi_project_applications_by_status',
    'Number of project applications by status',
    ['status'],
  );

  recordMatchingSuccess(
    target: string,
    mode: string,
    detailLevel: string,
    durationSeconds: number,
    resultCount?: number,
  ) {
    this.recordMatching(target, mode, detailLevel, 'success', durationSeconds, resultCount);
  }

  recordMatchingFailure(target: string, mode: string, detailLevel: string, durationSeconds: number) {
    this.recordMatching(target, mode, detailLevel, 'error', durationSeconds);
  }

  async trackMatching<T>(
    target: string,
    mode: string | undefined,
    detailLevel: string | undefined,
    run: () => Promise<T>,
    extractCount?: (result: T) => number,
  ): Promise<T> {
    const started = process.hrtime.bigint();
    let status: MatchingStatus = 'success';
    let result: T | undefined;
    try {
      result = await run();
      return result;
    } catch (error) {
      status = 'error';
      if (error instanceof AppException) throw error;
      throw AppError.internal('monitoring.matchingFailed', {
        details: {
          target,
          mode: mode ?? undefined,
          detailLevel: detailLevel ?? undefined,
        },
      });
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
      const modeLabel = mode ?? 'unknown';
      const detailLabel = detailLevel ?? 'unknown';
      if (status === 'success') {
        const count = extractCount && result !== undefined ? extractCount(result) : undefined;
        this.recordMatchingSuccess(target, modeLabel, detailLabel, durationSeconds, count);
      } else {
        this.recordMatchingFailure(target, modeLabel, detailLabel, durationSeconds);
      }
    }
  }

  private recordMatching(
    target: string,
    mode: string,
    detailLevel: string,
    status: MatchingStatus,
    durationSeconds: number,
    resultCount?: number,
  ) {
    const safeMode = mode || 'unknown';
    const safeDetail = detailLevel || 'unknown';
    this.matchingRequests.inc({ target, mode: safeMode, detail_level: safeDetail, status });
    this.matchingDurations.observe({ target, mode: safeMode }, Math.max(0, durationSeconds));
    if (status === 'success' && resultCount !== undefined) {
      this.matchingResults.observe({ target, mode: safeMode }, Math.max(0, resultCount));
    }
  }

  recordQueueSize(queue: string, status: string, value: number) {
    this.queueSizes.set({ queue, status }, Math.max(0, value));
  }

  recordQueueJobProcessed(queue: string, jobName: string, durationSeconds?: number) {
    this.queueProcessed.inc({ queue, job: jobName, status: 'completed' });
    if (durationSeconds !== undefined) {
      this.queueDurations.observe({ queue, job: jobName }, Math.max(0, durationSeconds));
    }
  }

  recordQueueJobFailed(queue: string, jobName: string) {
    this.queueProcessed.inc({ queue, job: jobName, status: 'failed' });
  }

  setUserTotal(value: number) {
    this.userTotals.set({}, this.toNonNegative(value));
  }

  setVerifiedUserTotal(value: number) {
    this.userVerifiedTotals.set({}, this.toNonNegative(value));
  }

  setUserStatusTotal(status: string, value: number) {
    this.userStatusTotals.set({ status }, this.toNonNegative(value));
  }

  setProfileTotal(value: number) {
    this.profileTotals.set({}, this.toNonNegative(value));
  }

  setProfileVisibilityTotal(visibility: string, value: number) {
    this.profileVisibilityTotals.set({ visibility }, this.toNonNegative(value));
  }

  setProfileCompletedTotal(value: number) {
    this.profileCompletedTotals.set({}, this.toNonNegative(value));
  }

  setProfileAvatarTotal(value: number) {
    this.profileAvatarTotals.set({}, this.toNonNegative(value));
  }

  setProfileBioTotal(value: number) {
    this.profileBioTotals.set({}, this.toNonNegative(value));
  }

  setProjectTotal(value: number) {
    this.projectTotals.set({}, this.toNonNegative(value));
  }

  setProjectStatusTotal(status: string, value: number) {
    this.projectStatusTotals.set({ status }, this.toNonNegative(value));
  }

  setProjectVisibilityTotal(visibility: string, value: number) {
    this.projectVisibilityTotals.set({ visibility }, this.toNonNegative(value));
  }

  setProjectPositionStatusTotal(status: string, value: number) {
    this.projectPositionTotals.set({ status }, this.toNonNegative(value));
  }

  setProjectMemberTotal(value: number) {
    this.projectMemberTotals.set({}, this.toNonNegative(value));
  }

  setProjectMemberStatusTotal(status: string, value: number) {
    this.projectMemberStatusTotals.set({ status }, this.toNonNegative(value));
  }

  setProjectApplicationTotal(value: number) {
    this.projectApplicationTotals.set({}, this.toNonNegative(value));
  }

  setProjectApplicationStatusTotal(status: string, value: number) {
    this.projectApplicationStatusTotals.set({ status }, this.toNonNegative(value));
  }

  async snapshot(): Promise<string> {
    const metrics = [
      this.matchingRequests.toPrometheus(),
      this.matchingDurations.toPrometheus(),
      this.matchingResults.toPrometheus(),
      this.queueSizes.toPrometheus(),
      this.queueProcessed.toPrometheus(),
      this.queueDurations.toPrometheus(),
      this.userTotals.toPrometheus(),
      this.userVerifiedTotals.toPrometheus(),
      this.userStatusTotals.toPrometheus(),
      this.profileTotals.toPrometheus(),
      this.profileVisibilityTotals.toPrometheus(),
      this.profileCompletedTotals.toPrometheus(),
      this.profileAvatarTotals.toPrometheus(),
      this.profileBioTotals.toPrometheus(),
      this.projectTotals.toPrometheus(),
      this.projectStatusTotals.toPrometheus(),
      this.projectVisibilityTotals.toPrometheus(),
      this.projectPositionTotals.toPrometheus(),
      this.projectMemberTotals.toPrometheus(),
      this.projectMemberStatusTotals.toPrometheus(),
      this.projectApplicationTotals.toPrometheus(),
      this.projectApplicationStatusTotals.toPrometheus(),
      this.buildProcessUptimeGauge(),
    ]
      .filter((block) => block)
      .join('\n');

    return metrics.concat('\n');
  }

  private buildProcessUptimeGauge(): string {
    const uptime = process.uptime();
    return [
      '# HELP cofound_process_uptime_seconds Uptime of the API process in seconds',
      '# TYPE cofound_process_uptime_seconds gauge',
      `cofound_process_uptime_seconds ${uptime.toFixed(3)}`,
    ].join('\n');
  }

  private toNonNegative(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.round(value));
  }
}
