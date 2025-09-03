import { EmbeddingPort } from '../embedding.port';

export class OpenAIEmbeddingAdapter implements EmbeddingPort {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  ) {}

  async embedText(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const vec: number[] = json?.data?.[0]?.embedding ?? [];
    return vec;
  }
}
