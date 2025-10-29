import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
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
import { MonitoringService } from '../monitoring/monitoring.service';
import { MatchEntityType } from './types/match-entity-type.enum';
import type { MatchExplanationFilterInput } from './types/match-explanation-filter.input';
import type { MatchExplanationConnection, MatchExplanation } from './types/match-explanation.type';
import type {
  BidirectionalInsightType,
  CompetitiveInsightType,
  ContactPlanStepType,
  DimensionScore,
  MatchForceType,
  MatchGapType,
  MatchRecommendationActionType,
} from './types/match-explainability.type';
import {
  QueryIntent,
  QueryIntentMatch,
  MAX_TOTAL_WEIGHT,
  addTagWeight,
  buildIntentSkillWeights,
  capTotalTagWeight,
  computeIntentSkillAffinity,
  detectRoleSignal,
  isLexicalToken,
  shouldApplyIntent,
  toTagCanonical,
  tokenizeQuery,
} from './utils/query-intent.util';
import { normalizeForSearch } from './utils/text-normalize.util';

const EMPTY_PROFILE_CONN: ProfileMatchConnection = {
  items: [] as ProfileMatch[],
  nextCursor: undefined,
};

const EMPTY_PROJECT_CONN: ProjectMatchConnection = {
  items: [] as ProjectMatch[],
  nextCursor: undefined,
};

const MATCH_ALGO_VERSION = '2025.10.8';
const EVALUATION_CONCURRENCY = 50;
const TEAM_ROLE_MULTI_DELTA = 0.05;
const TEAM_ROLE_SIMILARITY_THRESHOLD = 0.35;
const EXPLANATION_RETENTION_DAYS = 60;
const EXPLANATION_CLEANUP_INTERVAL_MS = 1000 * 60 * 60 * 6;
const TRAINING_TRIGGER_COOLDOWN_MS = 1000 * 60 * 5;
const MATCH_TRANSACTION_TIMEOUT_MS = 1000 * 20;
const DEFAULT_DETAIL_LEVEL = MatchDetailLevel.ENRICHED;

const URGENCY_VALUES = new Set<string>(Object.values(UrgencyLevel));

const OPEN_POSITION_EXISTS_CLAUSE = `
  EXISTS (
    SELECT 1
    FROM project_positions
    WHERE project_positions.project_id = projects.id
      AND project_positions.status = 'open'
  )
`.trim();

type TeamRole = 'leader' | 'contributor' | 'mentor' | 'learner';

const TEAM_ROLE_VALUES: TeamRole[] = ['leader', 'contributor', 'mentor', 'learner'];

const TEAM_ROLE_KEYWORDS: Record<TeamRole, string[]> = {
  leader: [
    'lead',
    'leader',
    'leadership',
    'responsable',
    'manager',
    'management',
    'chef de projet',
    'owner',
    'product owner',
    'product manager',
    'project manager',
    'tech lead',
    'head of',
    'scrum master',
  ],
  contributor: [
    'contributor',
    'contributeur',
    'member',
    'membre',
    'developer',
    'développeur',
    'developpeur',
    'engineer',
    'ingénieur',
    'ingenieur',
    'product designer',
    'designer ux',
    'ux designer',
    'ui designer',
    'ux/ui',
    'designer',
    'specialist',
    'spécialiste',
    'consultant',
    'expert',
    'data scientist',
    'data analyst',
    'maker',
  ],
  mentor: [
    'mentor',
    'coach',
    'adviser',
    'advisor',
    'conseiller',
    'senior',
    'mentoring',
    'tuteur',
    'guide',
    'formateur',
    'enseignant',
    'maître',
    'maitre',
  ],
  learner: [
    'apprentice',
    'apprenti',
    'junior',
    'stagiaire',
    'intern',
    'alternant',
    'etudiant',
    'étudiant',
    'apprentissage',
    'student',
    'learner',
  ],
};

const isTeamRole = (value: string | null | undefined): value is TeamRole =>
  !!value && TEAM_ROLE_VALUES.includes(value as TeamRole);

const TEAM_ROLE_REFERENCE_TEXT: Record<TeamRole, string> = {
  leader: "Leadership, pilotage stratégique, coordination d'équipe, définition de la vision produit et prise de décisions clés.",
  contributor:
    "Contributeur ou contributrice opérationnel·le réalisant des tâches techniques ou design pour faire avancer le projet.",
  mentor:
    'Mentor ou coach accompagnant une équipe, partageant son expérience et aidant à monter en compétence.',
  learner:
    "Profil en apprentissage (junior, alternant, stagiaire) cherchant à développer ses compétences aux côtés de l'équipe.",
};

type ProjectPositionSummary = {
  title?: string | null;
  description?: string | null;
};

type ProfileCandidateEvaluation = {
  match: ProfileMatch;
  candidate: { id: string; user_id: string; distance: number };
  composite: CompositeScoreOutput;
  profileId: string;
};

type ProjectCandidateEvaluation = {
  match: ProjectMatch;
  candidate: { id: string; owner_id: string; distance: number };
  composite: CompositeScoreOutput;
  projectId: string;
};

const normalizeForRoleMatching = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const inferRoleFromText = (text?: string | null): TeamRole | null => {
  if (!text) return null;
  const normalized = normalizeForRoleMatching(text);
  for (const [role, keywords] of Object.entries(TEAM_ROLE_KEYWORDS) as Array<[
    TeamRole,
    string[],
  ]>) {
    if (
      keywords.some((keyword) => normalized.includes(normalizeForRoleMatching(keyword)))
    ) {
      return role;
    }
  }
  return null;
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

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

function parseExplanationCursor(cur?: string): { createdAt: Date | null; id: string | null } {
  if (!cur) return { createdAt: null, id: null };
  try {
    const raw = Buffer.from(cur, 'base64').toString('utf8');
    const idx = raw.lastIndexOf(':');
    if (idx <= 0) return { createdAt: null, id: null };
    const ts = raw.slice(0, idx);
    const id = raw.slice(idx + 1);
    const createdAt = new Date(ts);
    if (!id || Number.isNaN(createdAt.getTime())) {
      return { createdAt: null, id: null };
    }
    return { createdAt, id };
  } catch {
    return { createdAt: null, id: null };
  }
}

function encodeExplanationCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}:${id}`).toString('base64');
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private teamRoleEmbeddingsPromise: Promise<Map<TeamRole, number[]>> | null = null;
  private lastExplanationCleanupAt = 0;
  private lastTrainingTriggerAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly port: EmbeddingPort,
    private readonly compositeScore: CompositeScoreService,
    private readonly successPrediction: SuccessPredictionService,
    private readonly monitoring: MonitoringService,
  ) {}

  private async withEfSearch<T>(
    efSearch: number | undefined | null,
    run: (db: DbLike) => Promise<T>,
  ): Promise<T> {
    const client = this.prisma.prisma() as unknown as PrismaClient;

    if (efSearch && Number.isInteger(efSearch) && efSearch > 0) {
      return client.$transaction(
        async (tx: Prisma.TransactionClient) => {
          await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
          return run(tx as unknown as DbLike);
        },
        { timeout: MATCH_TRANSACTION_TIMEOUT_MS },
      );
    }

    return run(client as unknown as DbLike);
  }

  private async inferQueryIntentFromText(
    db: DbLike,
    text: string,
    vectorLiteral: string,
  ): Promise<QueryIntent | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const normalized = normalizeForSearch(trimmed);
    if (!normalized) return null;

    const tokens = tokenizeQuery(normalized);
    if (!tokens.length) return null;

    const rows = await db.$queryRawUnsafe<
      Array<{ id: string; slug: string | null; name: string; category: string | null; distance: number }>
    >(
      `
        SELECT id::text AS id, slug, name, category,
               (embedding <=> $1::halfvec) AS distance
        FROM skills
        WHERE embedding IS NOT NULL
        ORDER BY (embedding <=> $1::halfvec) ASC
        LIMIT $2::int
      `,
      vectorLiteral,
      25,
    );

    const tagWeights = new Map<string, number>();
    const matchByTag = new Map<string, QueryIntentMatch>();
    const tokenSet = new Set(tokens);

    const registerMatch = (
      skillId: string | null,
      slug: string | null,
      name: string | null,
      category: string | null,
      similarity: number,
      weight: number,
    ) => {
      if (!skillId || !name) return;
      if (!Number.isFinite(similarity) || similarity <= 0) return;
      if (!Number.isFinite(weight) || weight <= 0) return;

      const label = slug ?? name;
      if (!label) return;

      const canonical = toTagCanonical(label);
      if (!canonical) return;

      addTagWeight(tagWeights, canonical, weight);
      const finalWeight = tagWeights.get(canonical);
      if (!finalWeight) return;

      const existing = matchByTag.get(canonical);
      if (!existing || existing.weight < finalWeight || existing.similarity < similarity) {
        matchByTag.set(canonical, {
          tag: canonical,
          skillId,
          name,
          category: category ?? null,
          similarity,
          weight: finalWeight,
          source: 'skill',
        });
      }
    };

    for (const row of rows) {
      const distance = typeof row.distance === 'number' ? row.distance : Number(row.distance);
      if (!Number.isFinite(distance)) continue;
      const similarity = Math.max(0, Math.min(1, 1 - distance));
      if (similarity <= 0.35) {
        break;
      }

      registerMatch(row.id ?? null, row.slug, row.name, row.category ?? null, similarity, similarity * 0.8);
    }

    if (tokens.length && tagWeights.size < 6) {
      const lexicalTokens = tokens.filter(isLexicalToken);
      if (lexicalTokens.length) {
        const patterns = lexicalTokens.map((token) => `%${token}%`);
        const lexicalRows = await db.$queryRawUnsafe<
          Array<{ id: string; slug: string | null; name: string; category: string | null }>
        >(
          `
            SELECT id::text AS id, slug, name, category
            FROM skills
            WHERE (slug ILIKE ANY($1::text[]) OR name ILIKE ANY($1::text[]))
              AND (embedding IS NOT NULL)
            LIMIT $2::int
          `,
          patterns,
          50,
        );

        for (const row of lexicalRows) {
          if (!row?.id || !row.name) continue;
          const nameTokens = tokenizeQuery(normalizeForSearch(row.name));
          if (!nameTokens.length) continue;
          const overlap = nameTokens.filter((token) => tokenSet.has(token));
          if (!overlap.length) continue;

          const coverage = nameTokens.length ? overlap.length / nameTokens.length : 0;
          if (coverage < 0.35 && overlap.length < 2) continue;

          const similarity = Math.min(1, Math.max(0.4, coverage + Math.min(0.3, overlap.length / Math.max(tokens.length, 1))));
          const weight = Math.min(0.75, Math.max(0.25, similarity));
          registerMatch(row.id, row.slug, row.name, row.category ?? null, similarity, weight);
        }
      }
    }

    if (!tagWeights.size) return null;

    const totalWeight = capTotalTagWeight(tagWeights);
    const matches: QueryIntentMatch[] = [];
    const skillWeights = new Map<string, number>();
    tagWeights.forEach((weight, tag) => {
      const match = matchByTag.get(tag);
      if (match) {
        matches.push({ ...match, weight });
        skillWeights.set(match.skillId, weight);
      }
    });

    if (!matches.length) return null;

    matches.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.similarity - a.similarity;
    });

    const topSimilarity = matches.reduce((max, match) => Math.max(max, match.similarity), 0);
    const diversity = Math.min(1, matches.length / 5);
    const coverage = Math.min(1, totalWeight / MAX_TOTAL_WEIGHT);

    let confidence = 0.35;
    confidence += Math.min(0.4, topSimilarity * 0.5);
    confidence += Math.min(0.2, coverage * 0.5);
    confidence += Math.min(0.1, diversity * 0.5);
    confidence = Math.max(0.2, Math.min(1, Number(confidence.toFixed(3))));

    let { hasRoleSignal, roleMatches } = detectRoleSignal(tokens, matches);
    if (!hasRoleSignal) {
      const strongMatches = matches.filter((match) => match.similarity >= 0.6 || match.weight >= 0.3);
      if (strongMatches.length >= 1 || matches.length >= 2) {
        hasRoleSignal = true;
        roleMatches = Math.max(roleMatches, strongMatches.length || matches.length);
      }
    }

    return {
      tagWeights,
      skillWeights,
      confidence,
      hasRoleSignal,
      roleMatches,
      matchedSkills: matches.length,
      totalWeight,
      matches,
    };
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
        AND visibility = 'public'
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

    let queryIntent: QueryIntent | null = null;
    let applyIntentToScore = false;

    return this.monitoring.trackMatching(
      'profiles',
      mode ? String(mode) : undefined,
      detailLevel,
      () =>
        this.withEfSearch(efSearch, async (db) => {
          let candidates: Array<{ id: string; user_id: string; distance: number }> = [];

          if (mode === MatchMode.BY_TEXT) {
            if (!text) return EMPTY_PROFILE_CONN;
            const vec = await this.port.embedText(text);
            if (!vec.length) return EMPTY_PROFILE_CONN;
            const lit = toVectorLiteral(vec, EMBEDDING_DIM);
            queryIntent = await this.inferQueryIntentFromText(db, text, lit);

            applyIntentToScore = shouldApplyIntent(queryIntent);
            const applyIntentToVector = applyIntentToScore && !filters?.tagsAny?.length;

            const runVectorSearch = async (applyIntentTags: boolean) => {
              const values: any[] = [preselect, lit];
              const vectorParamIndex = values.length; // equals 2 at initialization
              const where: string[] = [
                'embedding IS NOT NULL',
                filters?.includeUnlisted
                  ? "visibility IN ('public','unlisted')"
                  : "visibility = 'public'",
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
              } else if (applyIntentTags && queryIntent?.tagWeights.size) {
                const inferredTags = Array.from(queryIntent.tagWeights.keys());
                if (inferredTags.length) {
                  const idx = values.push(inferredTags);
                  where.push(`tags && $${idx}::text[]`);
                }
              }
              if (threshold != null) {
                const idx = values.push(threshold);
                where.push(`(embedding <=> $${vectorParamIndex}::halfvec) <= $${idx}`);
              }
              if (cursorD != null && cursorId) {
                const idxD = values.push(cursorD);
                const idxI = values.push(cursorId);
                where.push(
                  `((embedding <=> $${vectorParamIndex}::halfvec), id) > ($${idxD}::float, $${idxI}::uuid)`,
                );
              }

              const sql = `
                SELECT id, user_id, (embedding <=> $${vectorParamIndex}::halfvec) AS distance
                FROM profiles
                WHERE ${where.join(' AND ')}
                ORDER BY (embedding <=> $${vectorParamIndex}::halfvec) ASC, id ASC
                LIMIT $1::int
              `;
              return db.$queryRawUnsafe(sql, ...values);
            };

            let vectorUsedIntent = false;
            if (applyIntentToVector) {
              const withIntent = await runVectorSearch(true);
              if (withIntent.length) {
                candidates = withIntent;
                vectorUsedIntent = true;
              } else {
                candidates = await runVectorSearch(false);
              }
            } else {
              candidates = await runVectorSearch(false);
            }

            if (queryIntent) {
              this.logger.debug('matching.intent', {
                query: text,
                inferredTags: Array.from(queryIntent.tagWeights.entries()).map(([tag, weight]) => ({
                  tag,
                  weight: Number(weight.toFixed(3)),
                })),
                confidence: Number(queryIntent.confidence.toFixed(3)),
                roleMatches: queryIntent.roleMatches,
                matchedSkills: queryIntent.matchedSkills,
                matches: queryIntent.matches.map((match) => ({
                  tag: match.tag,
                  skillId: match.skillId,
                  similarity: Number(match.similarity.toFixed(3)),
                  weight: Number(match.weight.toFixed(3)),
                  category: match.category,
                })),
                tagCount: queryIntent.tagWeights.size,
                totalTagWeight: Number(queryIntent.totalWeight.toFixed(3)),
                appliedToVector: vectorUsedIntent,
                appliedToScore: applyIntentToScore,
              });
            }
          } else if (mode === MatchMode.BY_PROJECT) {
            if (!projectId) return EMPTY_PROFILE_CONN;

            const src = await db.$queryRawUnsafe<{ ok: boolean }[]>(
              `SELECT EXISTS (SELECT 1 FROM projects WHERE id = $1::uuid AND embedding IS NOT NULL) AS ok`,
              projectId,
            );
            if (!src[0]?.ok) return EMPTY_PROFILE_CONN;

            const values: any[] = [projectId, preselect];
            const where: string[] = [
              'embedding IS NOT NULL',
              filters?.includeUnlisted
                ? "visibility IN ('public','unlisted')"
                : "visibility = 'public'",
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

          const projectPromise = projectId
            ? this.prisma.prisma().projects.findUnique({
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
            : Promise.resolve(null);

          const candProfilesPromise = this.prisma.prisma().profiles.findMany({
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

          const candSkillsPromise = this.prisma.prisma().user_skills.findMany({
            where: { user_id: { in: userIds } },
            select: { user_id: true, skill_id: true, level: true, years: true },
          });

          const candInterestsPromise = this.prisma.prisma().user_interests.findMany({
            where: { user_id: { in: userIds } },
            select: { user_id: true, interest_id: true },
          });

          const projectSkillsPromise = projectId
            ? this.prisma.prisma().project_skills.findMany({
                where: { project_id: projectId },
                select: { skill_id: true, importance: true },
              })
            : Promise.resolve([] as Array<{ skill_id: string; importance: number | null }>);

          const projectInterestsPromise = projectId
            ? this.prisma.prisma().project_interests.findMany({
                where: { project_id: projectId },
                select: { interest_id: true },
              })
            : Promise.resolve([] as Array<{ interest_id: string }>);

          const projectPositionsPromise = projectId
            ? this.prisma.prisma().project_positions.findMany({
                where: { project_id: projectId, status: 'open' },
                select: { title: true, description: true },
              })
            : Promise.resolve([] as ProjectPositionSummary[]);

          const [
            project,
            candProfiles,
            candSkills,
            candInterests,
            projSkills,
            projInterests,
            projectPositions,
          ] = await Promise.all([
            projectPromise,
            candProfilesPromise,
            candSkillsPromise,
            candInterestsPromise,
            projectSkillsPromise,
            projectInterestsPromise,
            projectPositionsPromise,
          ]);

          const candProfileByUser = new Map(candProfiles.map((p) => [p.user_id, p]));

          const resolvedProjectRoleNeed = project
            ? await this.resolveProjectRoleNeed(project.preferred_team_role ?? null, projectPositions)
            : null;

          const hasRealProjectSkills = projSkills.length > 0;
          const projSkillWeights = new Map(
            projSkills.map((s) => [s.skill_id, weightFor(s.importance ?? 0, null)]),
          );
          if (!projectId && applyIntentToScore && queryIntent?.skillWeights.size) {
            const synthetic = buildIntentSkillWeights(queryIntent);
            synthetic.forEach((weight, key) => {
              if (!projSkillWeights.has(key)) {
                projSkillWeights.set(key, weight);
              }
            });
          }
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

          const evaluations = await this.runWithConcurrency(
            candidates,
            EVALUATION_CONCURRENCY,
            async (candidate) => {
              if (threshold != null && candidate.distance > threshold) return null;
              const profile = candProfileByUser.get(candidate.user_id);
              if (!profile) return null;

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

              const intentSkillAffinity = applyIntentToScore
                ? computeIntentSkillAffinity(candidateSkillMap, queryIntent)
                : 0;
              const semanticSim = 1 - candidate.distance;
              const semanticWithIntent = applyIntentToScore
                ? this.blendSemanticWithIntent(semanticSim, intentSkillAffinity)
                : semanticSim;

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
                  semanticSimilarity: semanticWithIntent,
                  hasProjectSkills: hasRealProjectSkills,
                  intentTagAffinity: intentSkillAffinity,
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
                  projectRoleNeed: resolvedProjectRoleNeed,
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
              return { match, candidate, composite, profileId: profile.id };
            },
          );

          const aggregated = evaluations.filter(
            (entry): entry is ProfileCandidateEvaluation => entry !== null,
          );

          aggregated.sort((a, b) => b.match.score - a.match.score);
          const sliced = aggregated.slice(0, k);
          const nextCursor = sliced.length
            ? encodeCursor(sliced[sliced.length - 1].candidate.distance, sliced[sliced.length - 1].candidate.id)
            : undefined;

          await Promise.all(
            sliced.map((entry) =>
              this.persistExplanation({
                entityType: 'project',
                profileId: entry.profileId,
                projectId: project?.id ?? null,
                counterpartProfileId: null,
                counterpartProjectId: project?.id ?? null,
                detailLevel,
                composite: entry.composite,
              }),
            ),
          );

          return { items: sliced.map((entry) => entry.match), nextCursor };
        }),
      (connection) => connection.items.length,
    );
  }

  async matchProjects(input: MatchProjectsInput, requestingUserId?: string): Promise<ProjectMatchConnection> {
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

    const excludedUserIds = new Set<string>();
    if (requestingUserId) excludedUserIds.add(requestingUserId);
    if (profile?.user_id) excludedUserIds.add(profile.user_id);

    return this.monitoring.trackMatching(
      'projects',
      mode ? String(mode) : undefined,
      detailLevel,
      () =>
        this.withEfSearch(efSearch, async (db) => {
        let candidates: Array<{ id: string; owner_id: string; distance: number }> = [];

        if (mode === MatchMode.BY_TEXT) {
          if (!text) return EMPTY_PROJECT_CONN;
          const vec = await this.port.embedText(text);
          if (!vec.length) return EMPTY_PROJECT_CONN;
          const lit = toVectorLiteral(vec, EMBEDDING_DIM);

          const values: any[] = [preselect, lit];
          const vectorParamIndex = values.length; // equals 2 at initialization
          const where: string[] = [
            'embedding IS NOT NULL',
            filters?.includeUnlisted
              ? "visibility IN ('public','unlisted')"
              : "visibility = 'public'",
            OPEN_POSITION_EXISTS_CLAUSE,
          ];
          if (filters?.tagsAny?.length) {
            const idx = values.push(filters.tagsAny);
            where.push(`tags && $${idx}::text[]`);
          }
          if (threshold != null) {
            const idx = values.push(threshold);
            where.push(`(embedding <=> $${vectorParamIndex}::halfvec) <= $${idx}`);
          }
          if (cursorD != null && cursorId) {
            const idxD = values.push(cursorD);
            const idxI = values.push(cursorId);
            where.push(
              `((embedding <=> $${vectorParamIndex}::halfvec), id) > ($${idxD}::float, $${idxI}::uuid)`,
            );
          }

          const sql = `
            SELECT id, owner_id, (embedding <=> $${vectorParamIndex}::halfvec) AS distance
            FROM projects
            WHERE ${where.join(' AND ')}
            ORDER BY (embedding <=> $${vectorParamIndex}::halfvec) ASC, id ASC
            LIMIT $1::int
          `;
          candidates = await db.$queryRawUnsafe(sql, ...values);
        } else if (mode === MatchMode.BY_PROFILE) {
          if (!profileId || !profile) return EMPTY_PROJECT_CONN;

          const values: any[] = [profileId, preselect];
          const where: string[] = [
            'embedding IS NOT NULL',
            filters?.includeUnlisted
              ? "visibility IN ('public','unlisted')"
              : "visibility = 'public'",
            OPEN_POSITION_EXISTS_CLAUSE,
          ];
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

        if (excludedUserIds.size) {
          candidates = candidates.filter((candidate) => !excludedUserIds.has(candidate.owner_id));
          if (!candidates.length) return EMPTY_PROJECT_CONN;

          const candidateIds = candidates.map((candidate) => candidate.id);
          if (candidateIds.length) {
            const membershipUserIds = Array.from(excludedUserIds);
            const memberships = await this.prisma
              .prisma()
              .project_members.findMany({
                where: {
                  project_id: { in: candidateIds },
                  user_id: { in: membershipUserIds },
                  status: 'active',
                },
                select: { project_id: true },
              });

            if (memberships.length) {
              const excludedProjectIds = new Set(memberships.map((membership) => membership.project_id));
              candidates = candidates.filter((candidate) => !excludedProjectIds.has(candidate.id));
              if (!candidates.length) return EMPTY_PROJECT_CONN;
            }
          }
        }

        const projectIds = candidates.map((c) => c.id);

        const candProjectsPromise = this.prisma.prisma().projects.findMany({
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

        const openPositionsPromise = this.prisma.prisma().project_positions.findMany({
          where: { project_id: { in: projectIds }, status: 'open' },
          select: { project_id: true, title: true, description: true },
        });

        const projectSkillsPromise = this.prisma.prisma().project_skills.findMany({
          where: { project_id: { in: projectIds } },
          select: { project_id: true, skill_id: true, importance: true },
        });

        const projectInterestsPromise = this.prisma.prisma().project_interests.findMany({
          where: { project_id: { in: projectIds } },
          select: { project_id: true, interest_id: true },
        });

        const [candProjects, openPositions, projectSkills, projectInterests] = await Promise.all([
          candProjectsPromise,
          openPositionsPromise,
          projectSkillsPromise,
          projectInterestsPromise,
        ]);

        const projectById = new Map(candProjects.map((p) => [p.id, p]));

        const positionsByProject = new Map<string, ProjectPositionSummary[]>();
        for (const position of openPositions) {
          const list = positionsByProject.get(position.project_id) ?? [];
          list.push({ title: position.title, description: position.description });
          positionsByProject.set(position.project_id, list);
        }

        const roleEvaluations = await this.runWithConcurrency(
          candProjects,
          Math.min(EVALUATION_CONCURRENCY, 25),
          async (project) => {
            const positions = positionsByProject.get(project.id) ?? [];
            const resolvedRole = await this.resolveProjectRoleNeed(
              project.preferred_team_role ?? null,
              positions,
            );
            return { projectId: project.id, role: resolvedRole };
          },
        );

        const roleNeedByProject = new Map<string, TeamRole | TeamRole[] | null>();
        for (const evaluation of roleEvaluations) {
          roleNeedByProject.set(evaluation.projectId, evaluation.role ?? null);
        }

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

        const evaluations = await this.runWithConcurrency(
          candidates,
          EVALUATION_CONCURRENCY,
          async (candidate) => {
            if (threshold != null && candidate.distance > threshold) return null;
            const project = projectById.get(candidate.id);
            if (!project) return null;

            const projectSkillMap = skillsByProject.get(project.id) ?? new Map<string, number>();
            const projectInterestSet = interestsByProject.get(project.id) ?? new Set<string>();
            const resolvedRoleNeed = roleNeedByProject.get(project.id) ?? null;

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

            const normalizedProject = {
              ...project,
              project_skills: Array.isArray((project as any).project_skills)
                ? (project as any).project_skills
                : Array.from(projectSkillMap.keys()),
              project_interests: Array.isArray((project as any).project_interests)
                ? (project as any).project_interests
                : Array.from(projectInterestSet.values()),
            };

            const compositeInput: CompositeScoreInput = {
              detailLevel,
              context: {
                sector: normalizedProject.industry ?? null,
                projectType: normalizedProject.stage ?? null,
                urgency: mapUrgencyToDomain(normalizedProject.urgency),
              },
              technical: {
                projectSkills: projectSkillMap,
                candidateSkills: profileSkillMap,
                semanticSimilarity: semanticSim,
                hasProjectSkills: projectSkillMap.size > 0,
              },
              culture: {
                profileValues: profile?.core_values ?? [],
                projectValues: normalizedProject.culture_values ?? [],
                profileWorkStyles: profile?.preferred_work_styles ?? [],
                projectWorkStyles: normalizedProject.culture_work_styles ?? [],
                preferredEnvironments: profile?.preferred_environments ?? [],
                projectEnvironment: normalizedProject.environment ?? null,
              },
              team: {
                preferredTeamSize: profile?.preferred_team_size ?? null,
                projectPreferredSize: normalizedProject.preferred_team_size ?? null,
                desiredRole: profile?.desired_team_role ?? null,
                projectRoleNeed: resolvedRoleNeed,
                communicationStyle: profile?.communication_style ?? null,
                projectCommunicationStyle: normalizedProject.communication_style ?? null,
                communicationFrequency: profile?.communication_frequency ?? null,
                projectCommunicationFrequency: normalizedProject.communication_frequency ?? null,
                teamRoles: (normalizedProject.project_members ?? [])
                  .filter((member) => member.status === 'active' && !!member.role)
                  .map((member) => member.role as string),
              },
              logistics: {
                availabilityHours: profile?.availability_hours ?? null,
                requiredHoursMin: normalizedProject.required_hours_min ?? null,
                requiredHoursMax: normalizedProject.required_hours_max ?? null,
                availabilitySlots: this.parseSlots(profile?.availability_time_slots),
                requiredSlots: this.parseSlots(normalizedProject.critical_time_slots),
                profileTimezone: profile?.timezone ?? null,
                projectTimezone: normalizedProject.timezone ?? null,
                remotePreference: profile?.remote_preference_percent ?? null,
                remoteRatioMin: normalizedProject.remote_ratio_min ?? null,
                remoteRatioMax: normalizedProject.remote_ratio_max ?? null,
                missionMinWeeks: profile?.mission_duration_min_weeks ?? null,
                missionMaxWeeks: profile?.mission_duration_max_weeks ?? null,
                projectMinWeeks: normalizedProject.duration_weeks_min ?? null,
                projectMaxWeeks: normalizedProject.duration_weeks_max ?? null,
              },
              experience: {
                profileSuccessRate: profile?.success_rate ?? null,
                profileAverageRating: profile?.average_rating ?? null,
                profileActivityScore: profile?.activity_score ?? null,
                projectAcceptanceRate: normalizedProject.acceptance_rate ?? null,
                projectAverageRating: normalizedProject.average_project_rating ?? null,
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
                projectTimezone: normalizedProject.timezone ?? null,
                profileCollaborationMode: profile?.preferred_collaboration_mode ?? null,
                projectCollaborationMode: normalizedProject.collaboration_mode ?? null,
                profileCommunicationStyle: profile?.communication_style ?? null,
                projectCommunicationStyle: normalizedProject.communication_style ?? null,
                profileCommunicationFrequency: profile?.communication_frequency ?? null,
                projectCommunicationFrequency: normalizedProject.communication_frequency ?? null,
                profileRemotePreference: profile?.remote_preference_percent ?? null,
                projectRemoteRatioMin: normalizedProject.remote_ratio_min ?? null,
                projectRemoteRatioMax: normalizedProject.remote_ratio_max ?? null,
                projectEnvironment: normalizedProject.environment ?? null,
              },
            };

            const composite = await this.compositeScore.evaluate(compositeInput);
            const match = this.buildProjectMatchOutput(
              normalizedProject,
              candidate.distance,
              composite,
              detailLevel,
            );
            return { match, candidate, composite, projectId: project.id };
          },
        );

        const aggregated = evaluations.filter(
          (entry): entry is ProjectCandidateEvaluation => entry !== null,
        );

        aggregated.sort((a, b) => b.match.score - a.match.score);
        const sliced = aggregated.slice(0, k);
        const nextCursor = sliced.length
          ? encodeCursor(sliced[sliced.length - 1].candidate.distance, sliced[sliced.length - 1].candidate.id)
          : undefined;

        await Promise.all(
          sliced.map((entry) =>
            this.persistExplanation({
              entityType: 'profile',
              profileId: profile?.id ?? null,
              projectId: entry.projectId,
              counterpartProfileId: profile?.id ?? null,
              counterpartProjectId: entry.projectId,
              detailLevel,
              composite: entry.composite,
            }),
          ),
        );

        return { items: sliced.map((entry) => entry.match), nextCursor };
        }),
      (connection) => connection.items.length,
    );
  }

  private async resolveProjectRoleNeed(
    fallback: string | null | undefined,
    positions: ProjectPositionSummary[],
  ): Promise<TeamRole | TeamRole[] | null> {
    const aggregatedText = positions
      .map((position) => {
        const parts: string[] = [];
        if (position.title && position.title.trim()) {
          parts.push(position.title.trim());
        }
        if (position.description && position.description.trim()) {
          parts.push(position.description.trim());
        }
        return parts.join('\n');
      })
      .filter((block) => block.length > 0)
      .join('\n\n');

    if (aggregatedText) {
      const truncatedText = aggregatedText.length > 2000 ? aggregatedText.slice(0, 2000) : aggregatedText;
      const keywordRole = inferRoleFromText(aggregatedText);
      if (keywordRole) return keywordRole;

      try {
        const [roleEmbeddings, positionEmbedding] = await Promise.all([
          this.getTeamRoleEmbeddings(),
          this.port.embedText(truncatedText),
        ]);

        if (positionEmbedding.length && roleEmbeddings.size) {
          const scoredRoles: Array<{ role: TeamRole; score: number }> = [];
          for (const [role, referenceEmbedding] of roleEmbeddings.entries()) {
            const score = cosineSimilarity(positionEmbedding, referenceEmbedding);
            scoredRoles.push({ role, score });
          }

          scoredRoles.sort((a, b) => b.score - a.score);
          const [best] = scoredRoles;
          if (best && best.score >= TEAM_ROLE_SIMILARITY_THRESHOLD) {
            const closeRoles = scoredRoles.filter(
              (entry) =>
                entry.score >= TEAM_ROLE_SIMILARITY_THRESHOLD &&
                best.score - entry.score <= TEAM_ROLE_MULTI_DELTA,
            );
            if (closeRoles.length > 1) {
              return closeRoles.map((entry) => entry.role);
            }
            return best.role;
          }
        }
      } catch {
        // Ignore embedding errors and fall back to stored preference below.
      }
    }

    return isTeamRole(fallback) ? fallback : null;
  }

  private async getTeamRoleEmbeddings(): Promise<Map<TeamRole, number[]>> {
    if (!this.teamRoleEmbeddingsPromise) {
      this.teamRoleEmbeddingsPromise = (async () => {
        const entries = await Promise.all(
          (Object.entries(TEAM_ROLE_REFERENCE_TEXT) as Array<[TeamRole, string]>).map(
            async ([role, text]) => {
              const embedding = await this.port.embedText(text);
              return embedding.length ? ([role, embedding] as const) : null;
            },
          ),
        );

        const map = new Map<TeamRole, number[]>();
        for (const entry of entries) {
          if (!entry) continue;
          const [role, embedding] = entry;
          map.set(role, embedding);
        }
        return map;
      })();
    }
    return this.teamRoleEmbeddingsPromise!;
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

  private blendSemanticWithIntent(semantic: number, tagAffinity: number): number {
    const base = Math.max(0, Math.min(1, semantic));
    const affinity = Math.max(0, Math.min(1, tagAffinity));
    const adjusted = base + 0.25 * (affinity - 0.2);
    return Math.max(0, Math.min(1, Number(adjusted.toFixed(6))));
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

  private scheduleExplanationCleanup() {
    const now = Date.now();
    if (now - this.lastExplanationCleanupAt < EXPLANATION_CLEANUP_INTERVAL_MS) {
      return;
    }
    this.lastExplanationCleanupAt = now;
    const retentionInterval = `${EXPLANATION_RETENTION_DAYS} days`;
    void this.prisma
      .prisma()
      .$executeRaw(
        Prisma.sql`DELETE FROM match_explanations WHERE created_at < NOW() - ${retentionInterval}::interval`,
      )
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Unable to purge outdated match explanations: ${err.message}`);
      });
  }

  private maybeTriggerSuccessTraining() {
    const now = Date.now();
    if (now - this.lastTrainingTriggerAt < TRAINING_TRIGGER_COOLDOWN_MS) {
      return;
    }
    this.lastTrainingTriggerAt = now;
    void this.successPrediction
      .triggerTrainingIfNeeded()
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Unable to schedule success model training: ${err.message}`);
      });
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    iteratee: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (!items.length) return [];
    const limit = Math.max(1, Math.min(concurrency, items.length));
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const workers = Array.from({ length: limit }, async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const index = cursor;
        if (index >= items.length) break;
        cursor += 1;
        results[index] = await iteratee(items[index], index);
      }
    });

    await Promise.all(workers);
    return results;
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

  private truncateArray<T>(value: T[] | null | undefined, limit: number): T[] {
    if (!value?.length || limit <= 0) return [];
    return value.slice(0, limit);
  }

  async listMatchExplanations(
    filter: MatchExplanationFilterInput | undefined,
    limit = 50,
    cursor?: string,
  ): Promise<MatchExplanationConnection> {
    const take = Math.max(1, Math.min(limit ?? 50, 100));
    const { createdAt: cursorCreatedAt, id: cursorId } = parseExplanationCursor(cursor);

    const where: Prisma.match_explanationsWhereInput = {};

    if (filter?.profileId) where.profile_id = filter.profileId;
    if (filter?.projectId) where.project_id = filter.projectId;
    if (filter?.counterpartProfileId) where.counterpart_profile_id = filter.counterpartProfileId;
    if (filter?.counterpartProjectId) where.counterpart_project_id = filter.counterpartProjectId;
    if (filter?.entityType) where.entity_type = filter.entityType;
    if (filter?.detailLevel) where.detail_level = filter.detailLevel;

    if (cursorCreatedAt) {
      const orConditions: Prisma.match_explanationsWhereInput[] = [
        { created_at: { lt: cursorCreatedAt } },
      ];
      if (cursorId) {
        orConditions.push({ created_at: cursorCreatedAt, id: { lt: cursorId } });
      }

      if (orConditions.length) {
        const cursorCondition: Prisma.match_explanationsWhereInput = {
          OR: orConditions,
        };
        const existingAnd = where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : [];
        where.AND = [...existingAnd, cursorCondition];
      }
    }

    const rows = await this.prisma
      .prisma()
      .match_explanations.findMany({
        where,
        orderBy: [
          { created_at: 'desc' },
          { id: 'desc' },
        ],
        take: take + 1,
      });

    const hasNext = rows.length > take;
    const slice = hasNext ? rows.slice(0, take) : rows;

    const toArray = <T>(value: Prisma.JsonValue | null | undefined): T[] => {
      if (Array.isArray(value)) return value as T[];
      return [];
    };

    const toObject = <T>(value: Prisma.JsonValue | null | undefined): T | null => {
      if (!value || Array.isArray(value)) return null;
      if (typeof value === 'object') return value as T;
      return null;
    };

    const items: MatchExplanation[] = slice.map((row) => ({
      id: row.id,
      entityType: row.entity_type as MatchEntityType,
      profileId: row.profile_id,
      projectId: row.project_id,
      counterpartProfileId: row.counterpart_profile_id,
      counterpartProjectId: row.counterpart_project_id,
      algorithmVersion: row.algorithm_version,
      detailLevel: row.detail_level as MatchDetailLevel,
      score: row.score,
      confidence: row.confidence,
      chemistryScore: row.chemistry_score,
      successProbability: row.success_probability,
      successConfidence: row.success_confidence,
      successModelVersion: row.success_model_version,
      dimensionScores: toArray<DimensionScore>(row.dimension_scores),
      forces: toArray<MatchForceType>(row.forces),
      gaps: toArray<MatchGapType>(row.gaps),
      recommendations: toArray<MatchRecommendationActionType>(row.recommendations),
      contactPlan: toArray<ContactPlanStepType>(row.contact_plan),
      competitiveContext: toObject<CompetitiveInsightType>(row.competitive_context),
      bidirectionalContext: toObject<BidirectionalInsightType>(row.bidirectional_context),
      metadata: toObject<Record<string, unknown>>(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const last = slice[slice.length - 1];
    const nextCursor = hasNext && last ? encodeExplanationCursor(last.created_at, last.id) : undefined;

    return {
      items,
      nextCursor,
    };
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
      this.scheduleExplanationCleanup();

      const dimensionScores = composite.dimensionResults.map((dimension) => ({
        key: dimension.key,
        score: dimension.score,
        confidence: dimension.confidence,
        weight: dimension.weight ?? null,
        strengths: this.truncateArray(dimension.strengths ?? [], 3),
        gaps: this.truncateArray(dimension.gaps ?? [], 3),
        actions: this.truncateArray(dimension.actions ?? [], 2),
        debug: dimension.debug ?? null,
      }));

      const digestPayload = {
        entityType,
        profileId,
        projectId,
        detailLevel,
        score: composite.score,
        successProbability: composite.successProbability,
        dimensions: dimensionScores.map((dimension) => ({
          key: dimension.key,
          score: dimension.score,
          confidence: dimension.confidence,
        })),
      };

      const digest = createHash('sha256').update(JSON.stringify(digestPayload)).digest('hex');

      const profileIdParam = profileId
        ? Prisma.sql`${profileId}::uuid`
        : Prisma.sql`NULL::uuid`;
      const projectIdParam = projectId
        ? Prisma.sql`${projectId}::uuid`
        : Prisma.sql`NULL::uuid`;
      const counterpartProfileIdParam = counterpartProfileId
        ? Prisma.sql`${counterpartProfileId}::uuid`
        : Prisma.sql`NULL::uuid`;
      const counterpartProjectIdParam = counterpartProjectId
        ? Prisma.sql`${counterpartProjectId}::uuid`
        : Prisma.sql`NULL::uuid`;

      const existing = await this.prisma
        .prisma()
        .$queryRaw<{ id: string }[]>(
          Prisma.sql`
            SELECT id
            FROM match_explanations
            WHERE entity_type = ${entityType}::"match_entity_type"
              AND profile_id IS NOT DISTINCT FROM ${profileIdParam}
              AND project_id IS NOT DISTINCT FROM ${projectIdParam}
              AND counterpart_profile_id IS NOT DISTINCT FROM ${counterpartProfileIdParam}
              AND counterpart_project_id IS NOT DISTINCT FROM ${counterpartProjectIdParam}
              AND metadata->>'digest' = ${digest}
            LIMIT 1
          `,
        );

      if (existing.length) {
        return;
      }

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
          dimension_scores: this.sanitizeJson(dimensionScores),
          forces: this.sanitizeJson(this.truncateArray(explainability.forces ?? [], 5)),
          gaps: this.sanitizeJson(this.truncateArray(explainability.gaps ?? [], 5)),
          recommendations: this.sanitizeJson(this.truncateArray(explainability.recommendations ?? [], 5)),
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
            digest,
          }),
        },
      });

      this.maybeTriggerSuccessTraining();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Unable to persist match explanation: ${err.message}`);
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
