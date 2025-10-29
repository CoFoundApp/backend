import {
  application_status,
  member_status,
  position_status,
  project_status,
  user_status,
  visibility,
} from '@prisma/client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MonitoringService } from './monitoring.service';

const rawInterval = Number(process.env.METRICS_KPI_POLL_MS ?? 60000);
const KPI_POLL_INTERVAL = Number.isFinite(rawInterval) ? Math.max(15000, rawInterval) : 60000;

const extractAllCount = (
  aggregate: true | { _all?: number | null } | null | undefined,
): number => {
  if (!aggregate || typeof aggregate === 'boolean') {
    return 0;
  }

  return aggregate._all ?? 0;
};

@Injectable()
export class KpiMetricsCollector implements OnModuleInit {
  private readonly logger = new Logger(KpiMetricsCollector.name);

  constructor(private readonly prisma: PrismaService, private readonly monitoring: MonitoringService) {}

  onModuleInit() {
    void this.collect();
  }

  @Interval(KPI_POLL_INTERVAL)
  async collect(): Promise<void> {
    await Promise.all([
      this.runSafely('users', () => this.collectUserMetrics()),
      this.runSafely('profiles', () => this.collectProfileMetrics()),
      this.runSafely('projects', () => this.collectProjectMetrics()),
      this.runSafely('projectMembers', () => this.collectProjectMemberMetrics()),
      this.runSafely('projectApplications', () => this.collectProjectApplicationMetrics()),
    ]);
  }

  private async runSafely(name: string, task: () => Promise<void>) {
    try {
      await task();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Unable to collect ${name} KPI metrics: ${err.message}`);
    }
  }

  private async collectUserMetrics() {
    const [totalUsers, verifiedUsers, statusGroups] = await this.prisma.$transaction([
      this.prisma.users.count(),
      this.prisma.users.count({ where: { email_verified_at: { not: null } } }),
      this.prisma.users.groupBy({
        by: ['status'] as const,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    this.monitoring.setUserTotal(totalUsers);
    this.monitoring.setVerifiedUserTotal(verifiedUsers);

    const statusCounts = new Map(
      statusGroups.map((group) => [group.status, extractAllCount(group._count)]),
    );
    for (const status of Object.values(user_status)) {
      this.monitoring.setUserStatusTotal(status, statusCounts.get(status) ?? 0);
    }
  }

  private async collectProfileMetrics() {
    const [totalProfiles, visibilityGroups, completedProfiles, avatarProfiles, bioProfiles] =
      await this.prisma.$transaction([
        this.prisma.profiles.count(),
        this.prisma.profiles.groupBy({
          by: ['visibility'] as const,
          orderBy: { visibility: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.profiles.count({
          where: {
            display_name: { not: null },
            headline: { not: null },
            bio: { not: null },
          },
        }),
        this.prisma.profiles.count({ where: { avatar_url: { not: null } } }),
        this.prisma.profiles.count({ where: { bio: { not: null } } }),
      ]);

    this.monitoring.setProfileTotal(totalProfiles);
    this.monitoring.setProfileCompletedTotal(completedProfiles);
    this.monitoring.setProfileAvatarTotal(avatarProfiles);
    this.monitoring.setProfileBioTotal(bioProfiles);

    const visibilityCounts = new Map(
      visibilityGroups.map((group) => [group.visibility, extractAllCount(group._count)]),
    );
    for (const value of Object.values(visibility)) {
      this.monitoring.setProfileVisibilityTotal(value, visibilityCounts.get(value) ?? 0);
    }
  }

  private async collectProjectMetrics() {
    const [totalProjects, statusGroups, visibilityGroups, positionGroups] = await this.prisma.$transaction([
      this.prisma.projects.count(),
      this.prisma.projects.groupBy({
        by: ['status'] as const,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.projects.groupBy({
        by: ['visibility'] as const,
        orderBy: { visibility: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.project_positions.groupBy({
        by: ['status'] as const,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    this.monitoring.setProjectTotal(totalProjects);

    const statusCounts = new Map(
      statusGroups.map((group) => [group.status, extractAllCount(group._count)]),
    );
    for (const status of Object.values(project_status)) {
      this.monitoring.setProjectStatusTotal(status, statusCounts.get(status) ?? 0);
    }

    const visibilityCounts = new Map(
      visibilityGroups.map((group) => [group.visibility, extractAllCount(group._count)]),
    );
    for (const value of Object.values(visibility)) {
      this.monitoring.setProjectVisibilityTotal(value, visibilityCounts.get(value) ?? 0);
    }

    const positionCounts = new Map(
      positionGroups.map((group) => [group.status, extractAllCount(group._count)]),
    );
    for (const status of Object.values(position_status)) {
      this.monitoring.setProjectPositionStatusTotal(status, positionCounts.get(status) ?? 0);
    }
  }

  private async collectProjectMemberMetrics() {
    const [totalMembers, statusGroups] = await this.prisma.$transaction([
      this.prisma.project_members.count(),
      this.prisma.project_members.groupBy({
        by: ['status'] as const,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    this.monitoring.setProjectMemberTotal(totalMembers);
    const statusCounts = new Map(
      statusGroups.map((group) => [group.status, extractAllCount(group._count)]),
    );
    for (const status of Object.values(member_status)) {
      this.monitoring.setProjectMemberStatusTotal(status, statusCounts.get(status) ?? 0);
    }
  }

  private async collectProjectApplicationMetrics() {
    const [totalApplications, statusGroups] = await this.prisma.$transaction([
      this.prisma.project_applications.count(),
      this.prisma.project_applications.groupBy({
        by: ['status'] as const,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    this.monitoring.setProjectApplicationTotal(totalApplications);
    const statusCounts = new Map(
      statusGroups.map((group) => [group.status, extractAllCount(group._count)]),
    );
    for (const status of Object.values(application_status)) {
      this.monitoring.setProjectApplicationStatusTotal(status, statusCounts.get(status) ?? 0);
    }
  }
}
