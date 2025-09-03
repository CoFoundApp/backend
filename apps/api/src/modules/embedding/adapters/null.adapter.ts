import { EmbeddingPort } from '../embedding.port';

export class NullEmbeddingAdapter implements EmbeddingPort {
  async embedText(_text: string): Promise<number[]> {
    return []; // pas d’embedding en MVP
  }
}
