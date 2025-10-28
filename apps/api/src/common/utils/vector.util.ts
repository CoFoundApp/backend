import { AppError } from '../errors/app-error.factory';

/** Vérifie la dimension et sérialise en littéral pgvector: '[v1,v2,...]' */
export const toVectorLiteral = (vec: number[], dim?: number) => {
  if (!Array.isArray(vec) || vec.length === 0) throw AppError.badRequest('embedding.emptyVector');
  if (typeof dim === 'number' && vec.length !== dim) {
    throw AppError.badRequest('embedding.invalidDimension', {
      details: { got: vec.length, expected: dim },
    });
  }
  const normalized = vec.map((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw AppError.badRequest('embedding.invalidComponent');
    }
    return Number(value).toString();
  });
  return `[${normalized.join(',')}]`;
};
