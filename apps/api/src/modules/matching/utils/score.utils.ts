export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const weightFor = (level?: number | null, years?: number | null) =>
  1 + 0.7 * (clamp(level ?? 0, 0, 5) / 5) + 0.3 * (clamp(years ?? 0, 0, 10) / 10);

export const weightedJaccard = (a: Map<string, number>, b: Map<string, number>) => {
  let inter = 0;
  let uni = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const va = a.get(key) ?? 0;
    const vb = b.get(key) ?? 0;
    inter += Math.min(va, vb);
    uni += Math.max(va, vb);
  }
  return uni === 0 ? 0 : inter / uni;
};

export type SkillMetadata = {
  id: string;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
};

const pushToken = (set: Set<string>, token: string) => {
  if (!token) return;
  set.add(token);
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);

const buildSkillTokens = (meta?: SkillMetadata | null) => {
  const tokens = new Set<string>();
  if (!meta) return tokens;

  const rawCandidates = [meta.slug, meta.name, meta.category].filter(
    (value): value is string => !!value && value.trim().length > 0,
  );

  const slugCandidates = rawCandidates.map((value) => normalizeToken(value));

  for (const slug of slugCandidates) {
    if (!slug) continue;
    pushToken(tokens, slug);

    const parts = slug.split('-').filter(Boolean);
    for (const part of parts) {
      if (part.length >= 3) {
        pushToken(tokens, part);
      }
    }
  }

  for (const candidate of rawCandidates) {
    const rawTokens = candidate
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^A-Za-z0-9]+/)
      .map((value) => value.toLowerCase())
      .filter(Boolean);

    for (const rawToken of rawTokens) {
      if (rawToken.length >= 2 && rawToken.length <= 4) {
        pushToken(tokens, rawToken);
      }
    }
  }

  return tokens;
};

const hasTokenAffinity = (a: Set<string>, b: Set<string>) => {
  for (const token of a) {
    if (b.has(token)) return true;
  }

  for (const tokenA of a) {
    for (const tokenB of b) {
      if (tokenA.length < 4 || tokenB.length < 4) continue;
      if (tokenA.includes(tokenB) || tokenB.includes(tokenA)) {
        return true;
      }
    }
  }

  return false;
};

export const projectAlignedCandidateSkills = (
  projectSkills: Map<string, number>,
  candidateSkills: Map<string, number>,
  options?: {
    projectMeta?: Map<string, SkillMetadata>;
    candidateMeta?: Map<string, SkillMetadata>;
  },
) => {
  if (!projectSkills.size) {
    return new Map(candidateSkills);
  }

  const filtered = new Map(
    Array.from(candidateSkills.entries())
      .filter(([skillId]) => projectSkills.has(skillId))
      .map(([skillId, weight]) => {
        const projectWeight = projectSkills.get(skillId) ?? 0;
        return [skillId, Math.min(weight, projectWeight)] as const;
      }),
  );

  const projectMeta = options?.projectMeta;
  const candidateMeta = options?.candidateMeta;
  if (!projectMeta || !candidateMeta) {
    return filtered;
  }

  const usedCandidateIds = new Set(filtered.keys());
  const candidateEntries = Array.from(candidateSkills.entries()).filter(
    ([skillId]) => !usedCandidateIds.has(skillId),
  );

  for (const [projectSkillId, projectWeight] of projectSkills.entries()) {
    if (filtered.has(projectSkillId)) continue;
    const projectTokens = buildSkillTokens(projectMeta.get(projectSkillId));
    if (!projectTokens.size) continue;

    let bestCandidate: { id: string; weight: number } | null = null;
    for (const [candidateSkillId, candidateWeight] of candidateEntries) {
      if (usedCandidateIds.has(candidateSkillId)) continue;
      const candidateTokens = buildSkillTokens(candidateMeta.get(candidateSkillId));
      if (!candidateTokens.size) continue;
      if (!hasTokenAffinity(projectTokens, candidateTokens)) continue;
      if (!bestCandidate || candidateWeight > bestCandidate.weight) {
        bestCandidate = { id: candidateSkillId, weight: candidateWeight };
      }
    }

    if (bestCandidate) {
      usedCandidateIds.add(bestCandidate.id);
      filtered.set(projectSkillId, Math.min(projectWeight, bestCandidate.weight));
    }
  }

  return filtered;
};

export const ratio = (num: number, den: number): number => {
  if (den <= 0) return 0;
  if (num <= 0) return 0;
  return Math.min(1, Math.max(0, num / den));
};
