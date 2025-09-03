import { EmbeddingPort } from '../embedding.port';
import { Mistral } from '@mistralai/mistralai';

export class MistralEmbeddingAdapter implements EmbeddingPort {
  private client: Mistral;
  private model: string;

  constructor(apiKey: string, model = process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed') {
    this.client = new Mistral({ apiKey });
    this.model = model;
  }

  async embedText(text: string): Promise<number[]> {
    const cleaned = text?.trim();
    if (!cleaned) return [];
    const res = await this.client.embeddings.create({
      model: this.model,
      inputs: [cleaned],
    });
    const vec = res?.data?.[0]?.embedding ?? [];
    return vec;
  }
}
