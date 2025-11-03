import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from '../interfaces/dimension-score.interface';
import { weightedJaccard } from '../utils/score.utils';

export interface TechnicalScoreInput {
  projectSkills: Map<string, number>;
  candidateSkills: Map<string, number>;
  semanticSimilarity: number;
  hasProjectSkills: boolean;
  intentTagAffinity?: number;
}

@Injectable()
export class TechnicalScoreService {
  async evaluate(input: TechnicalScoreInput): Promise<DimensionScoreResult> {
    const { projectSkills, candidateSkills, semanticSimilarity, hasProjectSkills, intentTagAffinity } = input;

    const filteredCandidateSkills = projectSkills.size
      ? new Map(
          Array.from(candidateSkills.entries()).filter(([skillId]) => projectSkills.has(skillId)),
        )
      : candidateSkills;

    const overlap = weightedJaccard(projectSkills, filteredCandidateSkills);
    const composite = hasProjectSkills ? 0.75 * overlap + 0.25 * semanticSimilarity : semanticSimilarity;
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (overlap >= 0.65) {
      strengths.push('Compétences clés fortement couvertes');
    } else if (overlap >= 0.35) {
      strengths.push('Compétences principales partiellement couvertes');
    } else if (hasProjectSkills) {
      gaps.push('Compétences principales à renforcer');
    }

    if (semanticSimilarity >= 0.75) {
      strengths.push('Parcours très proche des besoins décrits');
    } else if (semanticSimilarity < 0.5) {
      gaps.push('Expérience globale éloignée du besoin');
    }

    if (typeof intentTagAffinity === 'number' && !Number.isNaN(intentTagAffinity)) {
      if (intentTagAffinity >= 0.6) {
        strengths.push('Mots-clés intentionnels en forte adéquation');
      } else if (hasProjectSkills && intentTagAffinity < 0.2) {
        gaps.push('Tags intentionnels peu représentés dans le profil');
      }
    }

    const actions = gaps.length
      ? [
          {
            label: 'Mettre en avant ou développer les compétences manquantes prioritaires',
            impact: 0.2,
            effort: 0.4,
            eta: '2-4 semaines',
          },
        ]
      : [];

    return {
      key: 'technical',
      score: Number(composite.toFixed(3)),
      confidence: hasProjectSkills ? 0.9 : 0.6,
      strengths,
      gaps,
      actions,
      debug: {
        skillOverlap: overlap,
        semanticSimilarity,
        hasProjectSkills,
        intentTagAffinity: intentTagAffinity ?? null,
      },
    };
  }
}
