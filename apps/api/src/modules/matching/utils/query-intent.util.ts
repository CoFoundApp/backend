import { normalizeForSearch } from './text-normalize.util';

export type TagWeightMap = Map<string, number>;

export interface QueryIntentMatch {
  tag: string;
  skillId: string;
  weight: number;
  similarity: number;
  name: string;
  category: string | null;
  source: 'skill';
}

export interface QueryIntent {
  tagWeights: TagWeightMap;
  skillWeights: Map<string, number>;
  confidence: number;
  hasRoleSignal: boolean;
  roleMatches: number;
  matchedSkills: number;
  totalWeight: number;
  matches: QueryIntentMatch[];
}

export const INTENT_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_TAG_WEIGHT = 0.8;
export const MAX_TOTAL_WEIGHT = 0.4;

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'avec',
  'ce',
  'ces',
  'de',
  'des',
  'du',
  'en',
  'et',
  'for',
  'in',
  'le',
  'la',
  'les',
  'of',
  'ou',
  'par',
  'pour',
  'sur',
  'the',
  'to',
  'un',
  'une',
  'with',
]);

const NO_SINGULAR = new Set(['aws', 'ops', 'sre', 'ios', 'devops']);

const ROLE_SUFFIXES: readonly string[] = [
  'ers',
  'er',
  'ors',
  'or',
  'ists',
  'ist',
  'ians',
  'ian',
  'iennes',
  'ienne',
  'euses',
  'euse',
  'eurs',
  'eur',
  'ologues',
  'ologue',
  'logists',
  'logist',
  'ing',
];

export const toTagCanonical = (value: string): string => normalizeForSearch(value).replace(/\s+/g, '-');

const normalizeToken = (token: string): string => {
  if (!token) return token;
  if (NO_SINGULAR.has(token)) return token;
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
};

const expandTokenVariants = (token: string): string[] => {
  const variants = new Set<string>();
  if (token.length > 0) {
    variants.add(token);
  }

  for (const suffix of ROLE_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      variants.add(token.slice(0, -suffix.length));
    }
  }

  return Array.from(variants).filter((variant) => variant.length > 0);
};

export const tokenizeQuery = (text: string): string[] => {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of text.split(/\s+/)) {
    const base = normalizeToken(raw.trim());
    if (!base || STOPWORDS.has(base)) {
      continue;
    }

    for (const variant of expandTokenVariants(base)) {
      if (!variant || variant.length === 0 || STOPWORDS.has(variant) || seen.has(variant)) {
        continue;
      }
      seen.add(variant);
      tokens.push(variant);
    }
  }

  return tokens;
};

const ROLE_CATEGORY_HINTS = ['role', 'job', 'function', 'discipline', 'team'];

const LEXICAL_TOKEN = /^[a-z0-9][a-z0-9\-]{1,30}$/;
const MIN_LEXICAL_LENGTH = 2;

export const isLexicalToken = (token: string): boolean =>
  !!token && token.length >= MIN_LEXICAL_LENGTH && LEXICAL_TOKEN.test(token);

export const detectRoleSignal = (tokens: readonly string[], matches: QueryIntentMatch[]): {
  hasRoleSignal: boolean;
  roleMatches: number;
} => {
  let hasRoleSignal = false;
  let roleMatches = 0;

  const tokenSet = new Set(tokens);

  for (const match of matches) {
    const category = match.category?.toLowerCase() ?? '';
    const categoryLooksLikeRole = ROLE_CATEGORY_HINTS.some((hint) => category.includes(hint));

    if (categoryLooksLikeRole) {
      roleMatches += 1;
      hasRoleSignal = true;
      continue;
    }

    const nameTokens = tokenizeQuery(normalizeForSearch(match.name));
    if (!nameTokens.length) {
      continue;
    }

    const overlap = nameTokens.filter((token) => tokenSet.has(token));
    const coverage = nameTokens.length ? overlap.length / nameTokens.length : 0;

    if (overlap.length >= Math.min(2, nameTokens.length) || coverage >= 0.8) {
      roleMatches += 1;
      hasRoleSignal = true;
    }
  }

  return { hasRoleSignal, roleMatches };
};

export const addTagWeight = (map: TagWeightMap, tag: string, weight: number): number => {
  const canonical = toTagCanonical(tag);
  if (!canonical) return 0;
  const bounded = Math.min(MAX_TAG_WEIGHT, weight);
  const current = map.get(canonical) ?? 0;
  if (bounded <= current) return 0;
  map.set(canonical, Number(bounded.toFixed(6)));
  return bounded - current;
};

export const capTotalTagWeight = (map: TagWeightMap): number => {
  const entries = Array.from(map.entries());
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= MAX_TOTAL_WEIGHT) {
    return total;
  }
  const factor = MAX_TOTAL_WEIGHT / total;
  for (const [tag, weight] of entries) {
    map.set(tag, Number((weight * factor).toFixed(6)));
  }
  return MAX_TOTAL_WEIGHT;
};

export const shouldApplyIntent = (intent: QueryIntent | null): intent is QueryIntent =>
  !!intent && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD && intent.skillWeights.size > 0 && intent.hasRoleSignal;

export const buildIntentSkillWeights = (intent: QueryIntent | null): Map<string, number> => {
  const map = new Map<string, number>();
  if (!intent) return map;
  intent.skillWeights.forEach((weight, skillId) => {
    map.set(skillId, weight);
  });
  return map;
};

export const computeIntentSkillAffinity = (
  candidateSkills: Map<string, number>,
  intent: QueryIntent | null,
): number => {
  if (!intent || !intent.skillWeights.size || candidateSkills.size === 0) return 0;

  let matchWeight = 0;
  let totalWeight = 0;
  intent.skillWeights.forEach((weight, skillId) => {
    totalWeight += weight;
    if (candidateSkills.has(skillId)) {
      matchWeight += weight;
    }
  });

  if (!totalWeight) return 0;
  return Math.max(0, Math.min(1, matchWeight / totalWeight));
};
