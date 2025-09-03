export const EMBEDDING_PORT = 'EMBEDDING_PORT';

export interface EmbeddingPort {
  embedText(text: string): Promise<number[]>;
}

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 1024);
