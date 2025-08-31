import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT, EmbeddingPort, EMBEDDING_DIM } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { MatchProfilesInput } from './types/match-profiles-input.type';
import { ProfileMatch } from './types/profile-match.type';
import { MatchProjectsInput } from './types/match-projects-input.type';
import { ProjectMatch } from './types/project-match.type';
import { MatchMode } from './types/match-mode.enum';
import { LanguageCode } from '../../common/enums/domain.enums';
import { Prisma, PrismaClient } from '@prisma/client';
import { ProfileMatchConnection, ProjectMatchConnection } from './types/connection.input'

const EMPTY_PROFILE_CONN: ProfileMatchConnection = {
  items: [] as ProfileMatch[],
  nextCursor: undefined,
};
const EMPTY_PROJECT_CONN: ProjectMatchConnection = {
  items: [] as ProjectMatch[],
  nextCursor: undefined,
};

type DbLike = {
  $executeRawUnsafe: (query: string, ...params: any[]) => Promise<any>;
  $queryRawUnsafe: <T = any>(query: string, ...params: any[]) => Promise<T>;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const weightFor = (level?: number | null, years?: number | null) =>
  1 + 0.7 * (clamp(level ?? 0, 0, 5) / 5) + 0.3 * (clamp(years ?? 0, 0, 10) / 10);

const weightedJaccard = (a: Map<string, number>, b: Map<string, number>) => {
  let inter = 0, uni = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const va = a.get(k) ?? 0, vb = b.get(k) ?? 0;
    inter += Math.min(va, vb);
    uni   += Math.max(va, vb);
  }
  return uni === 0 ? 0 : inter / uni;
};

// cursor utils: base64("distance:id")
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

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly port: EmbeddingPort,
  ) {}

  /** Wrap SET LOCAL ef_search + KNN query on the same connection */
  private async withEfSearch<T>(
    efSearch: number | undefined | null,
    run: (db: DbLike) => Promise<T>,
  ): Promise<T> {
    // Typage explicite: on récupère bien un PrismaClient
    const client = this.prisma.prisma() as unknown as PrismaClient;

    if (efSearch && Number.isInteger(efSearch) && efSearch > 0) {
      return client.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
        return run(tx as unknown as DbLike);
      });
    }

    return run(client as unknown as DbLike);
  }

  // --- déjà existant (laisse comme avant) ---
  async suggestProfilesForUser(
    meUserId: string,
    limit = 20,
    preselect = 200,
    maxDistance = 0.4,
  ) {
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

    const profileIds = candidates.map(c => c.id);
    const userIds    = candidates.map(c => c.user_id);

    const [candProfiles, mySkills, candSkills, myInterests, candInterests] = await Promise.all([
      this.prisma.prisma().profiles.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true, user_id: true, display_name: true, headline: true,
          languages: true, availability_hours: true, visibility: true,
          created_at: true, updated_at: true,
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

    const candProfileByUser = new Map(candProfiles.map(p => [p.user_id, p]));
    const myW = new Map(mySkills.map(r => [r.skill_id, weightFor(r.level, r.years)]));
    const myInterSet = new Set(myInterests.map(r => r.interest_id));

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

    const results = [];
    for (const c of candidates) {
      if (c.distance > maxDistance) continue;
      const p = candProfileByUser.get(c.user_id);
      if (!p) continue;

      const wArr = skillsByUser.get(c.user_id) ?? [];
      const wMap = new Map(wArr.map(x => [x.skill_id, x.weight]));
      const skillOverlap = weightedJaccard(myW, wMap);

      const candInt = interestsByUser.get(c.user_id) ?? new Set<string>();
      let interI = 0, uniI = 0;
      const interKeys = new Set([...myInterSet, ...candInt]);
      for (const k of interKeys) {
        const a = myInterSet.has(k), b = candInt.has(k);
        interI += a && b ? 1 : 0;
        uniI   += a || b ? 1 : 0;
      }
      const interestOverlap = uniI ? interI / uniI : 0;

      const semanticSim = 1 - c.distance;
      const score = 0.60 * skillOverlap + 0.15 * interestOverlap + 0.25 * semanticSim;

      const reasons: string[] = [];
      if (skillOverlap >= 0.15) reasons.push('Compétences communes');
      if (interestOverlap >= 0.2) reasons.push('Centres d’intérêt partagés');
      if (semanticSim >= 0.7) reasons.push('Proximité sémantique');
      if (!reasons.length) reasons.push('Proximité générale');

      results.push({ profile: p, score, distance: c.distance, reasons });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async matchProfiles(input: MatchProfilesInput): Promise<ProfileMatchConnection> {
    const { mode, text, projectId, k = 20, threshold, efSearch, filters, cursor } = input;
    const preselect = Math.max(k * 5, 100);
    const { d: cursorD, id: cursorId } = parseCursor(cursor);

    return this.withEfSearch(efSearch, async (db) => {
      let candidates: Array<{ id: string; user_id: string; distance: number }> = [];

      if (mode === MatchMode.BY_TEXT) {
        if (!text) return EMPTY_PROFILE_CONN;;
        const vec = await this.port.embedText(text);
        if (!vec.length) return EMPTY_PROFILE_CONN;;
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
          const idx = values.push(filters.remote);
          where.push(`remote = $${idx}`);
        }
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> '${lit}'::vector) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(`((embedding <=> '${lit}'::vector), id) > ($${idxD}::float, $${idxI}::uuid)`);
        }

        const sql = `
          SELECT id, user_id, (embedding <=> '${lit}'::vector) AS distance
          FROM profiles
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> '${lit}'::vector) ASC, id ASC
          LIMIT $1::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else if (mode === MatchMode.BY_PROJECT) {
        if (!projectId) return EMPTY_PROFILE_CONN;;

        const src = await db.$queryRawUnsafe<{ ok: boolean }[]>(
          `SELECT EXISTS (SELECT 1 FROM projects WHERE id = $1::uuid AND embedding IS NOT NULL) AS ok`,
          projectId,
        );
        if (!src[0]?.ok) return EMPTY_PROFILE_CONN;;

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
          const idx = values.push(filters.remote);
          where.push(`remote = $${idx}`);
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
          where.push(`((embedding <=> (SELECT embedding FROM projects WHERE id = $1::uuid)), id) > ($${idxD}::float, $${idxI}::uuid)`);
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
        return EMPTY_PROFILE_CONN;;
      }

      const profileIds = candidates.map(c => c.id);
      const userIds = candidates.map(c => c.user_id);

      const candProfiles = await this.prisma.prisma().profiles.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true,
          user_id: true,
          display_name: true,
          headline: true,
          languages: true,
          availability_hours: true,
          visibility: true,
          tags: true,
          created_at: true,
          updated_at: true,
        },
      });

      const candProfileByUser = new Map(candProfiles.map(p => [p.user_id, p]));

      let projSkills: Array<{ skill_id: string; importance: number | null }> = [];
      let projInterests: Array<{ interest_id: string }> = [];
      if (mode === MatchMode.BY_PROJECT && projectId) {
        [projSkills, projInterests] = await Promise.all([
          this.prisma.prisma().project_skills.findMany({
            where: { project_id: projectId },
            select: { skill_id: true, importance: true },
          }),
          this.prisma.prisma().project_interests.findMany({
            where: { project_id: projectId },
            select: { interest_id: true },
          }),
        ]);
      }

      const candSkills = await this.prisma.prisma().user_skills.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, skill_id: true, level: true, years: true },
      });
      const candInterests = await this.prisma.prisma().user_interests.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, interest_id: true },
      });

      const projW = new Map(
        projSkills.map(s => [s.skill_id, weightFor(s.importance ?? 0, null)]),
      );
      const projInterSet = new Set(projInterests.map(i => i.interest_id));

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

      const results: ProfileMatch[] = [];
      for (const c of candidates) {
        if (threshold != null && c.distance > threshold) continue;
        const p = candProfileByUser.get(c.user_id);
        if (!p) continue;

        const wArr = skillsByUser.get(c.user_id) ?? [];
        const wMap = new Map(wArr.map(x => [x.skill_id, x.weight]));
        const skillOverlap = projW.size ? weightedJaccard(projW, wMap) : 0;

        const candInt = interestsByUser.get(c.user_id) ?? new Set<string>();
        let interI = 0, uniI = 0;
        const interKeys = new Set([...projInterSet, ...candInt]);
        for (const k2 of interKeys) {
          const a = projInterSet.has(k2), b = candInt.has(k2);
          interI += a && b ? 1 : 0;
          uniI   += a || b ? 1 : 0;
        }
        const interestOverlap = uniI ? interI / uniI : 0;

        const semanticSim = 1 - c.distance;
        const score = 0.6 * skillOverlap + 0.15 * interestOverlap + 0.25 * semanticSim;

        const reasons: string[] = [];
        if (skillOverlap >= 0.15) reasons.push('Compétences communes');
        if (interestOverlap >= 0.2) reasons.push("Centres d’intérêt partagés");
        if (semanticSim >= 0.7) reasons.push('Proximité sémantique');

        if (filters) {
          let all = true;
          let partial = false;
          if (filters.languages?.length) {
            const langs: string[] = p.languages ?? [];
            const allLang = filters.languages.every(l => langs.includes(l));
            if (!allLang) {
              all = false;
              if (langs.some(l => (filters.languages as LanguageCode[]).includes(l as LanguageCode)))
                partial = true;
            }
          }
          if (filters.minAvailabilityHours != null) {
            if ((p.availability_hours ?? 0) < filters.minAvailabilityHours) all = false;
          }
          if (filters.country) {
            if ((p as any).country !== filters.country) all = false;
          }
          if (filters.remote != null) {
            if ((p as any).remote !== filters.remote) all = false;
          }
          if (filters.tagsAny?.length) {
            const tags = p.tags ?? [];
            const matchCount = tags.filter(t => filters.tagsAny!.includes(t)).length;
            if (matchCount < filters.tagsAny.length) {
              if (matchCount > 0) partial = true;
              all = false;
            }
          }
          if (all) reasons.push('Contraintes compatibles');
          else if (partial) reasons.push('Contraintes partiellement compatibles');
        }

        if (!reasons.length) reasons.push('Proximité générale');

        results.push({ profile: p as any, distance: c.distance, score, reasons });
      }

      results.sort((a, b) => b.score - a.score);
      const sliced = results.slice(0, k);

      const nextCursor = sliced.length
        ? Buffer.from(`${sliced[sliced.length - 1].distance}:${(sliced[sliced.length - 1].profile as any).id}`).toString('base64')
        : undefined;

      return { items: sliced, nextCursor };
    });
  }

  async matchProjects(input: MatchProjectsInput): Promise<ProjectMatchConnection> {
    const { mode, text, profileId, k = 20, threshold, efSearch, filters, cursor } = input;
    const preselect = Math.max(k * 5, 100);
    const { d: cursorD, id: cursorId } = parseCursor(cursor);

    return this.withEfSearch(efSearch, async (db) => {
      let candidates: Array<{ id: string; owner_id: string; distance: number }> = [];

      if (mode === MatchMode.BY_TEXT) {
        if (!text) return EMPTY_PROJECT_CONN;;
        const vec = await this.port.embedText(text);
        if (!vec.length) return EMPTY_PROJECT_CONN;;
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
          const idx = values.push(filters.remote);
          where.push(`remote = $${idx}`);
        }
        if (filters?.tagsAny?.length) {
          const idx = values.push(filters.tagsAny);
          where.push(`tags && $${idx}::text[]`);
        }
        if (threshold != null) {
          const idx = values.push(threshold);
          where.push(`(embedding <=> '${lit}'::vector) <= $${idx}`);
        }
        if (cursorD != null && cursorId) {
          const idxD = values.push(cursorD);
          const idxI = values.push(cursorId);
          where.push(`((embedding <=> '${lit}'::vector), id) > ($${idxD}::float, $${idxI}::uuid)`);
        }

        const sql = `
          SELECT id, owner_id, (embedding <=> '${lit}'::vector) AS distance
          FROM projects
          WHERE ${where.join(' AND ')}
          ORDER BY (embedding <=> '${lit}'::vector) ASC, id ASC
          LIMIT $1::int
        `;
        candidates = await db.$queryRawUnsafe(sql, ...values);
      } else if (mode === MatchMode.BY_PROFILE) {
        if (!profileId) return EMPTY_PROJECT_CONN;;

        const prof = await db.$queryRawUnsafe<{ ok: boolean }[]>(
          `SELECT EXISTS (SELECT 1 FROM profiles WHERE id = $1::uuid AND embedding IS NOT NULL) AS ok`,
          profileId,
        );
        if (!prof[0]?.ok) return EMPTY_PROJECT_CONN;;

        const values: any[] = [profileId, preselect];
        const where: string[] = [
          "embedding IS NOT NULL",
          "visibility IN ('public','unlisted')",
          "owner_id <> (SELECT user_id FROM profiles WHERE id = $1::uuid)",
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
          const idx = values.push(filters.remote);
          where.push(`remote = $${idx}`);
        }
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
          where.push(`((embedding <=> (SELECT embedding FROM profiles WHERE id = $1::uuid)), id) > ($${idxD}::float, $${idxI}::uuid)`);
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
        return EMPTY_PROJECT_CONN;;
      }

      const projectIds = candidates.map(c => c.id);

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
          visibility: true,
          created_at: true,
          updated_at: true,
        },
      });

      const candProjectById = new Map(candProjects.map(p => [p.id, p]));

      let profSkills: Array<{ skill_id: string; level: number | null; years: number | null }> = [];
      let profInterests: Array<{ interest_id: string }> = [];
      if (mode === MatchMode.BY_PROFILE && profileId) {
        const profile = await this.prisma.prisma().profiles.findUnique({
          where: { id: profileId },
          select: { user_id: true },
        });
        const userId = profile?.user_id;
        if (userId) {
          [profSkills, profInterests] = await Promise.all([
            this.prisma.prisma().user_skills.findMany({
              where: { user_id: userId },
              select: { skill_id: true, level: true, years: true },
            }),
            this.prisma.prisma().user_interests.findMany({
              where: { user_id: userId },
              select: { interest_id: true },
            }),
          ]);
        }
      }

      const projSkills = await this.prisma.prisma().project_skills.findMany({
        where: { project_id: { in: projectIds } },
        select: { project_id: true, skill_id: true, importance: true },
      });
      const projInterests = await this.prisma.prisma().project_interests.findMany({
        where: { project_id: { in: projectIds } },
        select: { project_id: true, interest_id: true },
      });

      const profW = new Map(
        profSkills.map(s => [s.skill_id, weightFor(s.level, s.years)]),
      );
      const profInterSet = new Set(profInterests.map(i => i.interest_id));

      const skillsByProject = new Map<string, { skill_id: string; weight: number }[]>();
      for (const r of projSkills) {
        const arr = skillsByProject.get(r.project_id) ?? [];
        arr.push({ skill_id: r.skill_id, weight: weightFor(r.importance ?? 0, null) });
        skillsByProject.set(r.project_id, arr);
      }

      const interestsByProject = new Map<string, Set<string>>();
      for (const r of projInterests) {
        const set = interestsByProject.get(r.project_id) ?? new Set<string>();
        set.add(r.interest_id);
        interestsByProject.set(r.project_id, set);
      }

      const results: ProjectMatch[] = [];
      for (const c of candidates) {
        if (threshold != null && c.distance > threshold) continue;
        const proj = candProjectById.get(c.id);
        if (!proj) continue;

        const wArr = skillsByProject.get(c.id) ?? [];
        const wMap = new Map(wArr.map(x => [x.skill_id, x.weight]));
        const skillOverlap = profW.size ? weightedJaccard(profW, wMap) : 0;

        const candInt = interestsByProject.get(c.id) ?? new Set<string>();
        let interI = 0, uniI = 0;
        const interKeys = new Set([...profInterSet, ...candInt]);
        for (const k2 of interKeys) {
          const a = profInterSet.has(k2), b = candInt.has(k2);
          interI += a && b ? 1 : 0;
          uniI   += a || b ? 1 : 0;
        }
        const interestOverlap = uniI ? interI / uniI : 0;

        const semanticSim = 1 - c.distance;
        const score = 0.6 * skillOverlap + 0.15 * interestOverlap + 0.25 * semanticSim;

        const reasons: string[] = [];
        if (skillOverlap >= 0.15) reasons.push('Compétences communes');
        if (interestOverlap >= 0.2) reasons.push("Centres d’intérêt partagés");
        if (semanticSim >= 0.7) reasons.push('Proximité sémantique');

        if (filters) {
          let all = true;
          let partial = false;
          const langs: string[] = (proj as any).languages ?? [];
          if (filters.languages?.length) {
            const allLang = filters.languages.every(l => langs.includes(l));
            if (!allLang) {
              all = false;
              if (langs.some(l => (filters.languages as LanguageCode[]).includes(l as LanguageCode)))
                partial = true;
            }
          }
          if (filters.minAvailabilityHours != null) {
            if (((proj as any).availability_hours ?? 0) < filters.minAvailabilityHours) all = false;
          }
          if (filters.country) {
            if ((proj as any).country !== filters.country) all = false;
          }
          if (filters.remote != null) {
            if ((proj as any).remote !== filters.remote) all = false;
          }
          if (filters.tagsAny?.length) {
            const tags = proj.tags ?? [];
            const matchCount = tags.filter(t => filters.tagsAny!.includes(t)).length;
            if (matchCount < filters.tagsAny.length) {
              if (matchCount > 0) partial = true;
              all = false;
            }
          }
          if (all) reasons.push('Contraintes compatibles');
          else if (partial) reasons.push('Contraintes partiellement compatibles');
        }

        if (!reasons.length) reasons.push('Proximité générale');

        results.push({ project: proj as any, distance: c.distance, score, reasons });
      }

      results.sort((a, b) => b.score - a.score);
      const sliced = results.slice(0, k);

      const nextCursor = sliced.length
        ? Buffer.from(`${sliced[sliced.length - 1].distance}:${(sliced[sliced.length - 1].project as any).id}`).toString('base64')
        : undefined;

      return { items: sliced, nextCursor };
    });
  }
}
