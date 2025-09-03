export const trimToNull = (s?: string | null): string | null | undefined =>
  typeof s === 'string' ? (s.trim() === '' ? null : s.trim()) : s;

export const uniq = <T>(arr?: T[]) => Array.from(new Set(arr ?? []));

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
