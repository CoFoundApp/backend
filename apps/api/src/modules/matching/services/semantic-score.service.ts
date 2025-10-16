import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from '../interfaces/dimension-score.interface';

export interface SemanticScoreInput {
  similarity: number;
  hasEmbeddings: boolean;
}

@Injectable()
export class SemanticScoreService {
  async evaluate(input: SemanticScoreInput): Promise<DimensionScoreResult> {
    const score = Math.max(0, Math.min(1, input.similarity));
    return {
      key: 'semantic',
      score: Number(score.toFixed(3)),
      confidence: input.hasEmbeddings ? 0.9 : 0.4,
      strengths: score >= 0.7 ? ['Description et parcours très proches'] : [],
      gaps: score < 0.4 ? ['Renforcer le texte du profil pour le rendre plus pertinent'] : [],
      actions:
        score < 0.7
          ? [
              {
                label: 'Actualiser le résumé du profil avec les mots-clés du projet',
                impact: 0.12,
                effort: 0.15,
                eta: '20 minutes',
              },
            ]
          : [],
      debug: {
        similarity: score,
      },
    };
  }
}
