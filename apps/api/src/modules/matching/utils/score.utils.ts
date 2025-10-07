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

export const ratio = (num: number, den: number): number => {
  if (den <= 0) return 0;
  if (num <= 0) return 0;
  return Math.min(1, Math.max(0, num / den));
};
