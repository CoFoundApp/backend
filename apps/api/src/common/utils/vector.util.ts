/** Vérifie la dimension et sérialise en littéral pgvector: '[v1,v2,...]' */
export const toVectorLiteral = (vec: number[], dim?: number) => {
  if (!Array.isArray(vec) || vec.length === 0) throw new Error('Empty vector');
  if (typeof dim === 'number' && vec.length !== dim) {
    throw new Error(`Invalid vector dimension: got ${vec.length}, expected ${dim}`);
  }
  const normalized = vec.map((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Invalid vector component');
    }
    return Number(value).toString();
  });
  return `[${normalized.join(',')}]`;
};
