export type CursorPage<T> = { items: T[]; nextCursor?: string | null };

export const makeCursorPage = <T>(
  items: T[],
  limit: number,
): CursorPage<T> => ({
  items,
  nextCursor: items.length === limit ? (items as any)[items.length - 1].id : null,
});
