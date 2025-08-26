import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

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

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  // Suggestions de profils pour un utilisateur donné
  async suggestProfilesForUser(
    meUserId: string,
    limit = 20,
    preselect = 200,
    maxDistance = 0.4,
  ) {
    // (A) Vérifier qu’on a bien un embedding côté DB
    const has = await this.prisma.prisma().$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM profiles WHERE user_id = $1::uuid AND embedding IS NOT NULL
       ) AS exists`,
      meUserId,
    );
    if (!has[0]?.exists) return [];

    // (B) Pré-sélection sémantique via sous-SELECT (pas de lecture dans TS)
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
      ORDER BY embedding <=> (SELECT embedding FROM profiles WHERE user_id = $1::uuid)
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
}
