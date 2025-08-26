import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { EmbeddingResolver } from './embedding.resolver';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT } from './embedding.port';
import { NullEmbeddingAdapter } from './adapters/null.adapter';
import { OpenAIEmbeddingAdapter } from './adapters/openai.adapter';
import { MistralEmbeddingAdapter } from './adapters/mistral.adapter';
import { ProfileEmbeddingService } from './profile-embedding.service';

@Module({
  imports: [],
  providers: [
    PrismaService,
    EmbeddingService,
    EmbeddingResolver,
    ProfileEmbeddingService,
    {
      provide: EMBEDDING_PORT,
      useFactory: () => {
        const provider = (process.env.EMBEDDING_PROVIDER || 'null').toLowerCase();
        switch (provider) {
          case 'openai':
            if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
            return new OpenAIEmbeddingAdapter(process.env.OPENAI_API_KEY);
          case 'mistral':
            if (!process.env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY missing');
            return new MistralEmbeddingAdapter(process.env.MISTRAL_API_KEY);
          default:
            return new NullEmbeddingAdapter();
        }
      },
    },
  ],
  exports: [
    EmbeddingService,
    ProfileEmbeddingService,
    EMBEDDING_PORT,
  ],
})
export class EmbeddingModule {}
