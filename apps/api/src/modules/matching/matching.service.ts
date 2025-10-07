import { Injectable, Inject } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT, EmbeddingPort, EMBEDDING_DIM } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { MatchProfilesInput } from './types/match-profiles-input.type';
import { ProfileMatch } from './types/profile-match.type';
import { MatchProjectsInput } from './types/match-projects-input.type';
import { ProjectMatch } from './types/project-match.type';
import { MatchMode } from './types/match-mode.enum';
import { ProfileMatchConnection, ProjectMatchConnection } from './types/connection.input';
import { MatchRecommendation } from './types/match-recommendation.type';
import { CompositeScoreService } from './services/composite-score.service';
import { SuccessPredictionService } from './services/success-prediction.service';
import { MatchDetailLevel } from './types/match-detail-level.enum';
import { weightFor, weightedJaccard } from './utils/score.utils';
import { TimeSlotLike } from './interfaces/score.interface';
import { DimensionScoreResult } from './interfaces/dimension-score.interface';
import { ExplainabilityPayload } from './interfaces/explainability.interface';
import { UrgencyLevel } from '../../common/enums/domain.enums';
import { CompositeScoreInput, CompositeScoreOutput } from './interfaces/composite.interface';

const EMPTY_PROFILE_CONN: ProfileMatchConnection = {
  items: [] as ProfileMatch[],
  nextCursor: undefined,
};

const EMPTY_PROJECT_CONN: ProjectMatchConnection = {
  items: [] as ProjectMatch[],
  nextCursor: undefined,
};

const MATCH_ALGO_VERSION = '2025.10.7';
const DEFAULT_DETAIL_LEVEL = MatchDetailLevel.ENRICHED;

const URGENCY_VALUES = new Set<string>(Object.values(UrgencyLevel));

const mapUrgencyToDomain = (
  urgency: string | null | undefined,
): UrgencyLevel | null => {
  if (!urgency) return null;
  if (URGENCY_VALUES.has(urgency)) {
    return urgency as unknown as UrgencyLevel;
  }
  return null;
};

type DbLike = {
  $executeRawUnsafe: (query: string, ...params: any[]) => Promise<any>;
  $queryRawUnsafe: <T = any>(query: string, ...params: any[]) => Promise<T>;
};

function parseCursor(cur?: string): { d: number | null; id: string | null } {
  if (!cur) return { d: null, id: null };
  try {
    const raw = Buffer.from(cur, 'base64').toString('utf8');
    const idx = raw.lastIndexOf(':');
    if (idx <= 0) return { d: null, id: null };
    const d = parseFloat(raw.slice(0, idx));
    const id = raw.slice(idx + 1);
    if (!isFinite(d) || !id) return { d: null, id: null };
    return { d, id };
  } catch {
    return { d: null, id: null };
  }
}

function encodeCursor(distance: number, id: string): string {
  return Buffer.from(`${distance}:${id}`).toString('base64');
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly port: EmbeddingPort,
    private readonly compositeScore: CompositeScoreService,
    private readonly successPrediction: SuccessPredictionService,
  ) {}

  private async withEfSearch<T>(
    efSearch: number | undefined | null,
    run: (db: DbLike) => Promise<T>,
  ): Promise<T> {
    const client = this.prisma.prisma() as unknown as PrismaClient;

    if (efSearch && Number.isInteger(efSearch) && efSearch > 0) {
      return client.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
        return run(tx as unknown as DbLike);
      });
    }

    return run(client as unknown as DbLike);
  }

  async suggestProfilesForUser(
    meUserId: string,
    limit = 20,
    preselect = 200,
    maxDistance = 0.4,
  ): Promise<MatchRecommendation[]> {
    const has = await this.prisma.prisma().$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM profiles WHERE user_id = $1::uuid AND embedding IS NOT NULL
       ) AS exists`,
      meUserId,
    );
    if (!has[0]?.exists) return [];

    const candidates = await this.prisma.prisma().$queryRawUnsafe<
      Array<{ id: string; user_id: string; distance: number }>
    >(
      `
      SELECT id, user_id,
             (embedding <=> (SELECT embedding FROM profiles WHERE user_id = $1::uuid)) AS distance
      FROM profiles
      WHERE embedding IS NOT NULL
        AND user_id <> $1::uuid
        AND visibility IN ('public','unlisted')
      ORDER BY embedding <=> (SELECT embedding FROM profiles WHERE user_id = $1::uuid), id
      LIMIT $2::int
      `,
      meUserId,
      preselect,
    );

    const profileIds = candidates.map((c) => c.id);
    const userIds = candidates.map((c) => c.user_id);

    const [candProfiles, mySkills, candSkills, myInterests, candInterests] = await Promise.all([
      this.prisma.prisma().profiles.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true,
          user_id: true,
          display_name: true,
          headline: true,
          location: true,
          languages: true,
          availability_hours: true,
          visibility: true,
          tags: true,
          created_at: true,
          updated_at: true,
          preferred_work_styles: true,
          core_values: true,
          primary_motivations: true,
          preferred_environments: true,
          preferred_team_size: true,
          desired_team_role: true,
          communication_style: true,
          communication_frequency: true,
          preferred_collaboration_mode: true,
          timezone: true,
          timezone_flexibility_minutes: true,
          remote_preference_percent: true,
          availability_time_slots: true,
          mission_duration_min_weeks: true,
          mission_duration_max_weeks: true,
          success_rate: true,
          average_rating: true,
          average_response_time_minutes: true,
          last_active_at: true,
          activity_score: true,
        },
      }),
      this.prisma.prisma().user_skills.findMany({
        where: { user_id: meUserId },
        select: { skill_id: true, level: true, years: true },
      }),
      this.prisma.prisma().user_skills.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, skill_id: true, level: true, years: true },
      }),
      this.prisma.prisma().user_interests.findMany({
        where: { user_id: meUserId },
        select: { interest_id: true },
      }),
      this.prisma.prisma().user_interests.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, interest_id: true },
      }),
    ]);

    const candProfileByUser = new Map(candProfiles.map((p) => [p.user_id, p]));
    const myW = new Map(mySkills.map((r) => [r.skill_id, weightFor(r.level, r.years)]));
    const myInterSet = new Set(myInterests.map((r) => r.interest_id));

    const skillsByUser = new Map<string, { skill_id: string; weight: number }[]>();
    for (const r of candSkills) {
      const arr = skillsByUser.get(r.user_id) ?? [];
      arr.push({ skill_id: r.skill_id, weight: weightFor(r.level, r.years) });
      skillsByUser.set(r.user_id, arr);
    }

    const interestsByUser = new Map<string, Set<string>>();
    for (const r of candInterests) {
      const set = interestsByUser.get(r.user_id) ?? new Set<string>();
      set.add(r.interest_id);
      interestsByUser.set(r.user_id, set);
    }

    const results: MatchRecommendation[] = [];
    for (const c of candidates) {
      if (c.distance > maxDistance) continue;
      const p = candProfileByUser.get(c.user_id);
      if (!p) continue;

      const wArr = skillsByUser.get(c.user_id) ?? [];
      const wMap = new Map(wArr.map((x) => [x.skill_id, x.weight]));
      const skillOverlap = weightedJaccard(myW, wMap);

      const candInt = interestsByUser.get(c.user_id) ?? new Set<string>();
      let interI = 0;
      let uniI = 0;
      const interKeys = new Set([...myInterSet, ...candInt]);
      for (const k of interKeys) {
        const a = myInterSet.has(k);
        const b = candInt.has(k);
        interI += a && b ? 1 : 0;
        uniI += a || b ? 1 : 0;
      }
      const interestOverlap = uniI ? interI / uniI : 0;

      const semanticSim = 1 - c.distance;
      const score = 0.6 * skillOverlap + 0.15 * interestOverlap + 0.25 * semanticSim;

      const reasons: string[] = [];
      if (skillOverlap >= 0.15) reasons.push('Compétences communes');
      if (interestOverlap >= 0.2) reasons.push('Centres d’intérêt partagés');
      if (semanticSim >= 0.7) reasons.push('Proximité sémantique');
      if (!reasons.length) reasons.push('Proximité générale');

      results.push({ profile: p as unknown as any, score, distance: c.distance, reasons });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async matchProfiles(input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    const { mode, text, projectId, k = 20, threshold, efSearch, filters, cursor } = input;
    const detailLevel = input.detailLevel ?? DEFAULT_DETAIL_LEVEL;
    const preselect = Math.max(k * 5, 100);
    const { d: cursorD, id: cursorId } = parseCursor(cursor);

    return this.withEfSearch(efSearch, async (db) => {
      let candidates: Array<{ id: string; user_id: string; distance: number }> = [];

      if (mode === MatchMode.BY_TEXT) {
        if (!text) return EMPTY_PROFILE_CONN;
        const vec = await this.port.embedText(text);
        if (!vec.length) return EMPTY_PROFILE_CONN;
        const lit = toVectorLiteral(vec, EMBEDDING_DIM);

        const values: any[] = [preselect];
        const where: string[] = [
          "embedding IS NOT NULL",
          "visibility IN ('public','unlisted')",
        ];
        if (filters?.languages?.length) {
          const idx = values.push(filters.languages);
          where.push(`languages && $${idx}::text[]`);
        }
        if (filters?.minAvailabilityHours != null) {
          const idx = values.push(filters.minAvailabilityHours);
          where.push(`availability_hours >= $${idx}`);
        }
        if (filters?.country) {
          const idx = values.push(filters.country);
          where.push(`country = $${idx}`);
        }
        if (filters?.remote != null) {
          if (filters.remote) {
            where.push(`COALESCE(remote_preference_percent, 0) >= 70`);
          } else {
            where.push(`COALESCE(remote_preference_percent, 100) <= 30`);
          }
        }
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> '${lit}'::halfvec) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(`((embedding <=> '${lit}'::halfvec), id) > ($${idxD}::float, $${idxI}::uuid)`);
        }

        const sql = `
          SELECT id, user_id, (embedding <=> '${lit}'::halfvec) AS distance
          FROM profiles
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> '${lit}'::halfvec) ASC, id ASC
          LIMIT $1::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else if (mode === MatchMode.BY_PROJECT) {
        if (!projectId) return EMPTY_PROFILE_CONN;

        const src = await db.$queryRawUnsafe<{ ok: boolean }[]>(
          `SELECT EXISTS (SELECT 1 FROM projects WHERE id = $1::uuid AND embedding IS NOT NULL) AS ok`,
          projectId,
        );
        if (!src[0]?.ok) return EMPTY_PROFILE_CONN;

        const values: any[] = [projectId, preselect];
        const where: string[] = [
          "embedding IS NOT NULL",
          "visibility IN ('public','unlisted')",
        ];
        if (filters?.languages?.length) {
          const idx = values.push(filters.languages);
          where.push(`languages && $${idx}::text[]`);
        }
        if (filters?.minAvailabilityHours != null) {
          const idx = values.push(filters.minAvailabilityHours);
          where.push(`availability_hours >= $${idx}`);
        }
        if (filters?.country) {
          const idx = values.push(filters.country);
          where.push(`country = $${idx}`);
        }
        if (filters?.remote != null) {
          if (filters.remote) {
            where.push(`COALESCE(remote_preference_percent, 0) >= 70`);
          } else {
            where.push(`COALESCE(remote_preference_percent, 100) <= 30`);
          }
        }
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> (SELECT embedding FROM projects WHERE id = $1::uuid)) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(
            `((embedding <=> (SELECT embedding FROM projects WHERE id = $1::uuid)), id) > ($${idxD}::float, $${idxI}::uuid)`,
          );
        }

        const sql = `
          SELECT id, user_id,
                 (embedding <=> (SELECT embedding FROM projects WHERE id = $1::uuid)) AS distance
          FROM profiles
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> (SELECT embedding FROM projects WHERE id = $1::uuid)) ASC, id ASC
          LIMIT $2::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else {
        return EMPTY_PROFILE_CONN;
      }

      if (!candidates.length) return EMPTY_PROFILE_CONN;

      const profileIds = candidates.map((c) => c.id);
      const userIds = candidates.map((c) => c.user_id);

      const project = projectId
        ? await this.prisma.prisma().projects.findUnique({
            where: { id: projectId },
            select: {
              id: true,
              owner_id: true,
              title: true,
              summary: true,
              industry: true,
              tags: true,
              stage: true,
              status: true,
              culture_work_styles: true,
              culture_values: true,
              preferred_team_role: true,
              preferred_team_size: true,
              management_style: true,
              environment: true,
              collaboration_mode: true,
              communication_style: true,
              communication_frequency: true,
              project_members: {
                where: { status: 'active' },
                select: { role: true },
              },
              timezone: true,
              required_hours_min: true,
              required_hours_max: true,
              critical_time_slots: true,
              remote_ratio_min: true,
              remote_ratio_max: true,
              duration_weeks_min: true,
              duration_weeks_max: true,
              urgency: true,
              acceptance_rate: true,
              average_project_rating: true,
              average_response_time_minutes: true,
              created_at: true,
              updated_at: true,
            },
          })
        : null;

      const candProfiles = await this.prisma.prisma().profiles.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true,
          user_id: true,
          display_name: true,
          headline: true,
          location: true,
          languages: true,
          availability_hours: true,
          visibility: true,
          tags: true,
          created_at: true,
          updated_at: true,
          preferred_work_styles: true,
          core_values: true,
          primary_motivations: true,
          preferred_environments: true,
          preferred_team_size: true,
          desired_team_role: true,
          communication_style: true,
          communication_frequency: true,
          preferred_collaboration_mode: true,
          timezone: true,
          timezone_flexibility_minutes: true,
          remote_preference_percent: true,
          availability_time_slots: true,
          mission_duration_min_weeks: true,
          mission_duration_max_weeks: true,
          success_rate: true,
          average_rating: true,
          average_response_time_minutes: true,
          last_active_at: true,
          activity_score: true,
        },
      });

      const candProfileByUser = new Map(candProfiles.map((p) => [p.user_id, p]));

      const [projSkills, projInterests] = projectId
        ? await Promise.all([
            this.prisma.prisma().project_skills.findMany({
              where: { project_id: projectId },
              select: { skill_id: true, importance: true },
            }),
            this.prisma.prisma().project_interests.findMany({
              where: { project_id: projectId },
              select: { interest_id: true },
            }),
          ])
        : [[], []];

      const candSkills = await this.prisma.prisma().user_skills.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, skill_id: true, level: true, years: true },
      });

      const candInterests = await this.prisma.prisma().user_interests.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, interest_id: true },
      });

      const projSkillWeights = new Map(projSkills.map((s) => [s.skill_id, weightFor(s.importance ?? 0, null)]));
      const projInterestSet = new Set(projInterests.map((i) => i.interest_id));

      const skillsByUser = new Map<string, { skill_id: string; weight: number }[]>();
      for (const r of candSkills) {
        const arr = skillsByUser.get(r.user_id) ?? [];
        arr.push({ skill_id: r.skill_id, weight: weightFor(r.level, r.years) });
        skillsByUser.set(r.user_id, arr);
      }

      const interestsByUser = new Map<string, Set<string>>();
      for (const r of candInterests) {
        const set = interestsByUser.get(r.user_id) ?? new Set<string>();
        set.add(r.interest_id);
        interestsByUser.set(r.user_id, set);
      }

      const aggregated: Array<{ match: ProfileMatch; candidate: { id: string; user_id: string; distance: number } }> = [];
      for (const candidate of candidates) {
        if (threshold != null && candidate.distance > threshold) continue;
        const profile = candProfileByUser.get(candidate.user_id);
        if (!profile) continue;

        const wArr = skillsByUser.get(candidate.user_id) ?? [];
        const candidateSkillMap = new Map(wArr.map((x) => [x.skill_id, x.weight]));
        const skillOverlap = projSkillWeights.size ? weightedJaccard(projSkillWeights, candidateSkillMap) : 0;

        const candInt = interestsByUser.get(candidate.user_id) ?? new Set<string>();
        let interI = 0;
        let uniI = 0;
        const interKeys = new Set([...projInterestSet, ...candInt]);
        for (const k of interKeys) {
          const a = projInterestSet.has(k);
          const b = candInt.has(k);
          interI += a && b ? 1 : 0;
          uniI += a || b ? 1 : 0;
        }
        const interestOverlap = uniI ? interI / uniI : 0;

        const semanticSim = 1 - candidate.distance;

        const compositeInput: CompositeScoreInput = {
          detailLevel,
          context: {
            sector: project?.industry ?? null,
            projectType: project?.stage ?? null,
            urgency: mapUrgencyToDomain(project?.urgency),
          },
          technical: {
            projectSkills: projSkillWeights,
            candidateSkills: candidateSkillMap,
            semanticSimilarity: semanticSim,
            hasProjectSkills: projSkillWeights.size > 0,
          },
          culture: {
            profileValues: profile.core_values ?? [],
            projectValues: project?.culture_values ?? [],
            profileWorkStyles: profile.preferred_work_styles ?? [],
            projectWorkStyles: project?.culture_work_styles ?? [],
            preferredEnvironments: profile.preferred_environments ?? [],
            projectEnvironment: project?.environment ?? null,
          },
          team: {
            preferredTeamSize: profile.preferred_team_size ?? null,
            projectPreferredSize: project?.preferred_team_size ?? null,
            desiredRole: profile.desired_team_role ?? null,
            projectRoleNeed: project?.preferred_team_role ?? null,
            communicationStyle: profile.communication_style ?? null,
            projectCommunicationStyle: project?.communication_style ?? null,
            communicationFrequency: profile.communication_frequency ?? null,
            projectCommunicationFrequency: project?.communication_frequency ?? null,
            teamRoles:
              project?.project_members
                ? project.project_members
                    .filter((member) => member.role)
                    .map((member) => member.role as string)
                : null,
          },
          logistics: {
            availabilityHours: profile.availability_hours ?? null,
            requiredHoursMin: project?.required_hours_min ?? null,
            requiredHoursMax: project?.required_hours_max ?? null,
            availabilitySlots: this.parseSlots(profile.availability_time_slots),
            requiredSlots: this.parseSlots(project?.critical_time_slots),
            profileTimezone: profile.timezone ?? null,
            projectTimezone: project?.timezone ?? null,
            remotePreference: profile.remote_preference_percent ?? null,
            remoteRatioMin: project?.remote_ratio_min ?? null,
            remoteRatioMax: project?.remote_ratio_max ?? null,
            missionMinWeeks: profile.mission_duration_min_weeks ?? null,
            missionMaxWeeks: profile.mission_duration_max_weeks ?? null,
            projectMinWeeks: project?.duration_weeks_min ?? null,
            projectMaxWeeks: project?.duration_weeks_max ?? null,
          },
          experience: {
            profileSuccessRate: profile.success_rate ?? null,
            profileAverageRating: profile.average_rating ?? null,
            profileActivityScore: profile.activity_score ?? null,
            projectAcceptanceRate: project?.acceptance_rate ?? null,
            projectAverageRating: project?.average_project_rating ?? null,
            historicalSimilarity: semanticSim,
            goalsAlignment: interestOverlap,
          },
          semantic: {
            similarity: semanticSim,
            hasEmbeddings: true,
          },
          contact: {
            profileLocation: profile.location ?? null,
            profileTimezone: profile.timezone ?? null,
            projectTimezone: project?.timezone ?? null,
            profileCollaborationMode: profile.preferred_collaboration_mode ?? null,
            projectCollaborationMode: project?.collaboration_mode ?? null,
            profileCommunicationStyle: profile.communication_style ?? null,
            projectCommunicationStyle: project?.communication_style ?? null,
            profileCommunicationFrequency: profile.communication_frequency ?? null,
            projectCommunicationFrequency: project?.communication_frequency ?? null,
            profileRemotePreference: profile.remote_preference_percent ?? null,
            projectRemoteRatioMin: project?.remote_ratio_min ?? null,
            projectRemoteRatioMax: project?.remote_ratio_max ?? null,
            projectEnvironment: project?.environment ?? null,
          },
        };

        const composite = await this.compositeScore.evaluate(compositeInput);
        const match = this.buildProfileMatchOutput(profile, candidate.distance, composite, detailLevel);
        aggregated.push({ match, candidate });

        await this.persistExplanation({
          entityType: 'project',
          profileId: profile.id,
          projectId: project?.id ?? null,
          counterpartProfileId: null,
          counterpartProjectId: project?.id ?? null,
          detailLevel,
          composite,
        });
      }

      aggregated.sort((a, b) => b.match.score - a.match.score);
      const sliced = aggregated.slice(0, k);
      const nextCursor = sliced.length
        ? encodeCursor(sliced[sliced.length - 1].candidate.distance, sliced[sliced.length - 1].candidate.id)
        : undefined;

      return { items: sliced.map((entry) => entry.match), nextCursor };
    });
  }

  async matchProjects(input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    const { mode, text, profileId, k = 20, threshold, efSearch, filters, cursor } = input;
    const detailLevel = input.detailLevel ?? DEFAULT_DETAIL_LEVEL;
    const preselect = Math.max(k * 5, 100);
    const { d: cursorD, id: cursorId } = parseCursor(cursor);

    const profile = profileId
      ? await this.prisma.prisma().profiles.findUnique({
          where: { id: profileId },
          select: {
            id: true,
            user_id: true,
            display_name: true,
            headline: true,
            location: true,
            languages: true,
            availability_hours: true,
            tags: true,
            preferred_work_styles: true,
            core_values: true,
            primary_motivations: true,
            preferred_environments: true,
            preferred_team_size: true,
            desired_team_role: true,
            communication_style: true,
            communication_frequency: true,
            preferred_collaboration_mode: true,
            timezone: true,
            timezone_flexibility_minutes: true,
            remote_preference_percent: true,
            availability_time_slots: true,
            mission_duration_min_weeks: true,
            mission_duration_max_weeks: true,
            success_rate: true,
            average_rating: true,
            average_response_time_minutes: true,
            activity_score: true,
          },
        })
      : null;

    const profileSkills = profile
      ? await this.prisma.prisma().user_skills.findMany({
          where: { user_id: profile.user_id },
          select: { skill_id: true, level: true, years: true },
        })
      : [];

    const profileSkillMap = new Map(profileSkills.map((s) => [s.skill_id, weightFor(s.level, s.years)]));

    const profileInterests = profile
      ? await this.prisma.prisma().user_interests.findMany({
          where: { user_id: profile.user_id },
          select: { interest_id: true },
        })
      : [];
    const profileInterestSet = new Set(profileInterests.map((i) => i.interest_id));

    return this.withEfSearch(efSearch, async (db) => {
      let candidates: Array<{ id: string; owner_id: string; distance: number }> = [];

      if (mode === MatchMode.BY_TEXT) {
        if (!text) return EMPTY_PROJECT_CONN;
        const vec = await this.port.embedText(text);
        if (!vec.length) return EMPTY_PROJECT_CONN;
        const lit = toVectorLiteral(vec, EMBEDDING_DIM);

        const values: any[] = [preselect];
        const where: string[] = [
          "embedding IS NOT NULL",
          "visibility IN ('public','unlisted')",
        ];
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> '${lit}'::halfvec) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(`((embedding <=> '${lit}'::halfvec), id) > ($${idxD}::float, $${idxI}::uuid)`);
        }

        const sql = `
          SELECT id, owner_id, (embedding <=> '${lit}'::halfvec) AS distance
          FROM projects
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> '${lit}'::halfvec) ASC, id ASC
          LIMIT $1::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else if (mode === MatchMode.BY_PROFILE) {
        if (!profileId || !profile) return EMPTY_PROJECT_CONN;

        const values: any[] = [profileId, preselect];
        const where: string[] = ["embedding IS NOT NULL", "visibility IN ('public','unlisted')"];
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> (SELECT embedding FROM profiles WHERE id = $1::uuid)) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(
            `((embedding <=> (SELECT embedding FROM profiles WHERE id = $1::uuid)), id) > ($${idxD}::float, $${idxI}::uuid)`,
          );
        }

        const sql = `
          SELECT id, owner_id,
                 (embedding <=> (SELECT embedding FROM profiles WHERE id = $1::uuid)) AS distance
          FROM projects
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> (SELECT embedding FROM profiles WHERE id = $1::uuid)) ASC, id ASC
          LIMIT $2::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else {
        return EMPTY_PROJECT_CONN;
      }

      if (!candidates.length) return EMPTY_PROJECT_CONN;

      const projectIds = candidates.map((c) => c.id);

      const candProjects = await this.prisma.prisma().projects.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          owner_id: true,
          title: true,
          summary: true,
          description: true,
          industry: true,
          tags: true,
          status: true,
          stage: true,
          culture_work_styles: true,
          culture_values: true,
          preferred_team_role: true,
          preferred_team_size: true,
          management_style: true,
          environment: true,
          collaboration_mode: true,
          communication_style: true,
          communication_frequency: true,
          project_members: {
            where: { status: 'active' },
            select: {
              role: true,
              status: true,
            },
          },
          timezone: true,
          required_hours_min: true,
          required_hours_max: true,
          critical_time_slots: true,
          remote_ratio_min: true,
          remote_ratio_max: true,
          duration_weeks_min: true,
          duration_weeks_max: true,
          urgency: true,
          acceptance_rate: true,
          average_project_rating: true,
          average_response_time_minutes: true,
          created_at: true,
          updated_at: true,
        },
      });

      const projectById = new Map(candProjects.map((p) => [p.id, p]));

      const projectSkills = await this.prisma.prisma().project_skills.findMany({
        where: { project_id: { in: projectIds } },
        select: { project_id: true, skill_id: true, importance: true },
      });

      const projectInterests = await this.prisma.prisma().project_interests.findMany({
        where: { project_id: { in: projectIds } },
        select: { project_id: true, interest_id: true },
      });

      const skillsByProject = new Map<string, Map<string, number>>();
      for (const skill of projectSkills) {
        const map = skillsByProject.get(skill.project_id) ?? new Map<string, number>();
        map.set(skill.skill_id, weightFor(skill.importance ?? 0, null));
        skillsByProject.set(skill.project_id, map);
      }

      const interestsByProject = new Map<string, Set<string>>();
      for (const interest of projectInterests) {
        const set = interestsByProject.get(interest.project_id) ?? new Set<string>();
        set.add(interest.interest_id);
        interestsByProject.set(interest.project_id, set);
      }

      const aggregated: Array<{ match: ProjectMatch; candidate: { id: string; owner_id: string; distance: number } }> = [];
      for (const candidate of candidates) {
        if (threshold != null && candidate.distance > threshold) continue;
        const project = projectById.get(candidate.id);
        if (!project) continue;

        const projectSkillMap = skillsByProject.get(project.id) ?? new Map<string, number>();
        const projectInterestSet = interestsByProject.get(project.id) ?? new Set<string>();

        const skillOverlap = profile ? weightedJaccard(projectSkillMap, profileSkillMap) : 0;

        let interI = 0;
        let uniI = 0;
        const interKeys = new Set([...projectInterestSet, ...profileInterestSet]);
        for (const key of interKeys) {
          const a = projectInterestSet.has(key);
          const b = profileInterestSet.has(key);
          interI += a && b ? 1 : 0;
          uniI += a || b ? 1 : 0;
        }
        const interestOverlap = uniI ? interI / uniI : 0;

        const semanticSim = 1 - candidate.distance;

        const compositeInput: CompositeScoreInput = {
          detailLevel,
          context: {
            sector: project.industry ?? null,
            projectType: project.stage ?? null,
            urgency: mapUrgencyToDomain(project.urgency),
          },
          technical: {
            projectSkills: projectSkillMap,
            candidateSkills: profileSkillMap,
            semanticSimilarity: semanticSim,
            hasProjectSkills: projectSkillMap.size > 0,
          },
          culture: {
            profileValues: profile?.core_values ?? [],
            projectValues: project.culture_values ?? [],
            profileWorkStyles: profile?.preferred_work_styles ?? [],
            projectWorkStyles: project.culture_work_styles ?? [],
            preferredEnvironments: profile?.preferred_environments ?? [],
            projectEnvironment: project.environment ?? null,
          },
          team: {
            preferredTeamSize: profile?.preferred_team_size ?? null,
            projectPreferredSize: project.preferred_team_size ?? null,
            desiredRole: profile?.desired_team_role ?? null,
            projectRoleNeed: project.preferred_team_role ?? null,
            communicationStyle: profile?.communication_style ?? null,
            projectCommunicationStyle: project.communication_style ?? null,
            communicationFrequency: profile?.communication_frequency ?? null,
            projectCommunicationFrequency: project.communication_frequency ?? null,
            teamRoles: (project.project_members ?? [])
              .filter((member) => member.status === 'active' && !!member.role)
              .map((member) => member.role as string),
          },
          logistics: {
            availabilityHours: profile?.availability_hours ?? null,
            requiredHoursMin: project.required_hours_min ?? null,
            requiredHoursMax: project.required_hours_max ?? null,
            availabilitySlots: this.parseSlots(profile?.availability_time_slots),
            requiredSlots: this.parseSlots(project.critical_time_slots),
            profileTimezone: profile?.timezone ?? null,
            projectTimezone: project.timezone ?? null,
            remotePreference: profile?.remote_preference_percent ?? null,
            remoteRatioMin: project.remote_ratio_min ?? null,
            remoteRatioMax: project.remote_ratio_max ?? null,
            missionMinWeeks: profile?.mission_duration_min_weeks ?? null,
            missionMaxWeeks: profile?.mission_duration_max_weeks ?? null,
            projectMinWeeks: project.duration_weeks_min ?? null,
            projectMaxWeeks: project.duration_weeks_max ?? null,
          },
          experience: {
            profileSuccessRate: profile?.success_rate ?? null,
            profileAverageRating: profile?.average_rating ?? null,
            profileActivityScore: profile?.activity_score ?? null,
            projectAcceptanceRate: project.acceptance_rate ?? null,
            projectAverageRating: project.average_project_rating ?? null,
            historicalSimilarity: semanticSim,
            goalsAlignment: interestOverlap,
          },
          semantic: {
            similarity: semanticSim,
            hasEmbeddings: true,
          },
          contact: {
            profileLocation: profile?.location ?? null,
            profileTimezone: profile?.timezone ?? null,
            projectTimezone: project.timezone ?? null,
            profileCollaborationMode: profile?.preferred_collaboration_mode ?? null,
            projectCollaborationMode: project.collaboration_mode ?? null,
            profileCommunicationStyle: profile?.communication_style ?? null,
            projectCommunicationStyle: project.communication_style ?? null,
            profileCommunicationFrequency: profile?.communication_frequency ?? null,
            projectCommunicationFrequency: project.communication_frequency ?? null,
            profileRemotePreference: profile?.remote_preference_percent ?? null,
            projectRemoteRatioMin: project.remote_ratio_min ?? null,
            projectRemoteRatioMax: project.remote_ratio_max ?? null,
            projectEnvironment: project.environment ?? null,
          },
        };

        const composite = await this.compositeScore.evaluate(compositeInput);
        const match = this.buildProjectMatchOutput(project, candidate.distance, composite, detailLevel);
        aggregated.push({ match, candidate });

        await this.persistExplanation({
          entityType: 'profile',
          profileId: profile?.id ?? null,
          projectId: project.id,
          counterpartProfileId: profile?.id ?? null,
          counterpartProjectId: project.id,
          detailLevel,
          composite,
        });
      }

      aggregated.sort((a, b) => b.match.score - a.match.score);
      const sliced = aggregated.slice(0, k);
      const nextCursor = sliced.length
        ? encodeCursor(sliced[sliced.length - 1].candidate.distance, sliced[sliced.length - 1].candidate.id)
        : undefined;

      return { items: sliced.map((entry) => entry.match), nextCursor };
    });
  }

  private buildProfileMatchOutput(
    profile: any,
    distance: number,
    composite: CompositeScoreOutput,
    detailLevel: MatchDetailLevel,
  ): ProfileMatch {
    const dimensionScores = composite.dimensionResults.map((dimension) => this.toDimensionGraphQL(dimension));
    const explainability = composite.explainability;
    return {
      profile,
      distance,
      score: composite.score,
      confidence: explainability.confidence,
      successProbability: composite.successProbability,
      successConfidence: composite.successConfidence,
      successModelVersion: composite.successModelVersion ?? null,
      detailLevel,
      dimensionScores,
      forces: explainability.forces,
      gaps: explainability.gaps,
      recommendations: explainability.recommendations,
      chemistry: explainability.chemistry,
      competitive: explainability.competitive ?? null,
      bidirectional: explainability.bidirectional ?? null,
      contactPlan: explainability.contactPlan,
    } as ProfileMatch;
  }

  private buildProjectMatchOutput(
    project: any,
    distance: number,
    composite: CompositeScoreOutput,
    detailLevel: MatchDetailLevel,
  ): ProjectMatch {
    const dimensionScores = composite.dimensionResults.map((dimension) => this.toDimensionGraphQL(dimension));
    const explainability = composite.explainability;
    return {
      project,
      distance,
      score: composite.score,
      confidence: explainability.confidence,
      successProbability: composite.successProbability,
      successConfidence: composite.successConfidence,
      successModelVersion: composite.successModelVersion ?? null,
      detailLevel,
      dimensionScores,
      forces: explainability.forces,
      gaps: explainability.gaps,
      recommendations: explainability.recommendations,
      chemistry: explainability.chemistry,
      competitive: explainability.competitive ?? null,
      bidirectional: explainability.bidirectional ?? null,
      contactPlan: explainability.contactPlan,
    } as ProjectMatch;
  }

  private toDimensionGraphQL(dimension: DimensionScoreResult) {
    const { actions: _actions, ...rest } = dimension;
    return {
      key: rest.key,
      score: rest.score,
      confidence: rest.confidence,
      weight: rest.weight ?? null,
      strengths: rest.strengths,
      gaps: rest.gaps,
      debug: rest.debug ?? null,
    };
  }

  private parseSlots(source: unknown): TimeSlotLike[] {
    if (!Array.isArray(source)) return [];
    const slots: TimeSlotLike[] = [];
    for (const item of source) {
      if (!item) continue;
      const day = (item as any).day ?? (item as any).weekday ?? (item as any).d;
      const start = (item as any).start ?? (item as any).from;
      const end = (item as any).end ?? (item as any).to;
      if (typeof day === 'undefined' || typeof start !== 'string' || typeof end !== 'string') continue;
      slots.push({ day, start, end });
    }
    return slots;
  }

  private sanitizeJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private async persistExplanation(params: {
    entityType: 'profile' | 'project';
    profileId: string | null;
    projectId: string | null;
    counterpartProfileId: string | null;
    counterpartProjectId: string | null;
    detailLevel: MatchDetailLevel;
    composite: CompositeScoreOutput;
  }) {
    const { entityType, profileId, projectId, counterpartProfileId, counterpartProjectId, detailLevel, composite } = params;
    const explainability: ExplainabilityPayload = composite.explainability;
    try {
      await this.prisma.prisma().match_explanations.create({
        data: {
          profile_id: profileId,
          project_id: projectId,
          counterpart_profile_id: counterpartProfileId,
          counterpart_project_id: counterpartProjectId,
          entity_type: entityType,
          algorithm_version: MATCH_ALGO_VERSION,
          detail_level: detailLevel,
          score: composite.score,
          confidence: explainability.confidence,
          chemistry_score: composite.chemistryScore,
          success_probability: composite.successProbability,
          success_confidence: composite.successConfidence,
          success_model_version: composite.successModelVersion ?? null,
          dimension_scores: this.sanitizeJson(
            composite.dimensionResults.map((dimension) => ({
              key: dimension.key,
              score: dimension.score,
              confidence: dimension.confidence,
              weight: dimension.weight ?? null,
              strengths: dimension.strengths,
              gaps: dimension.gaps,
              actions: dimension.actions,
              debug: dimension.debug ?? null,
            })),
          ),
          forces: this.sanitizeJson(explainability.forces),
          gaps: this.sanitizeJson(explainability.gaps),
          recommendations: this.sanitizeJson(explainability.recommendations),
          contact_plan: this.sanitizeJson(explainability.contactPlan),
          competitive_context: explainability.competitive
            ? this.sanitizeJson(explainability.competitive)
            : Prisma.JsonNull,
          bidirectional_context: explainability.bidirectional
            ? this.sanitizeJson(explainability.bidirectional)
            : Prisma.JsonNull,
          metadata: this.sanitizeJson({
            generatedAt: new Date().toISOString(),
            successModelVersion: composite.successModelVersion ?? null,
            successConfidence: composite.successConfidence,
          }),
        },
      });
      void this.successPrediction
        .triggerTrainingIfNeeded()
        .catch((error) => console.warn('Unable to schedule success model training', error));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to persist match explanation', error);
    }
  }

  async precomputeProjectMatchesForProfile(
    profileId: string,
    detailLevel: MatchDetailLevel = DEFAULT_DETAIL_LEVEL,
    limit = 20,
  ): Promise<number> {
    if (!profileId) return 0;
    const k = Math.min(100, Math.max(1, Math.floor(limit ?? 20)));
    const result = await this.matchProjects({
      mode: MatchMode.BY_PROFILE,
      profileId,
      k,
      detailLevel,
    });
    return result.items.length;
  }

  async precomputeProfileMatchesForProject(
    projectId: string,
    detailLevel: MatchDetailLevel = DEFAULT_DETAIL_LEVEL,
    limit = 20,
  ): Promise<number> {
    if (!projectId) return 0;
    const k = Math.min(100, Math.max(1, Math.floor(limit ?? 20)));
    const result = await this.matchProfiles({
      mode: MatchMode.BY_PROJECT,
      projectId,
      k,
      detailLevel,
    });
    return result.items.length;
  }
}
