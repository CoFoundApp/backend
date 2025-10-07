import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from '../interfaces/dimension-score.interface';
import { ratio } from '../utils/score.utils';
import { ExperienceScoreInput } from '../interfaces/Experience.interface';

@Injectable()
export class ExperienceScoreService {
  async evaluate(input: ExperienceScoreInput): Promise<DimensionScoreResult> {
    const successRate = (input.profileSuccessRate ?? 0.5) * 100;
    const rating = input.profileAverageRating ?? 4;
    const activity = input.profileActivityScore ?? 0.5;
    const projectAcceptance = input.projectAcceptanceRate ?? 0.5;
    const projectRating = input.projectAverageRating ?? 4;
    const historicalSimilarity = input.historicalSimilarity ?? 0.5;
    const goalsAlignment = input.goalsAlignment ?? 0.5;

    const performanceScore = 0.4 * ratio(successRate, 100) + 0.2 * ratio(rating, 5);
    const reliabilityScore = 0.15 * ratio(projectAcceptance * 100, 100) + 0.1 * ratio(projectRating, 5);
    const trajectoryScore = 0.1 * activity + 0.05 * goalsAlignment;
    const similarityScore = 0.1 * historicalSimilarity;

    const composite = performanceScore + reliabilityScore + trajectoryScore + similarityScore;

    const strengths: string[] = [];
    const gaps: string[] = [];

    if (successRate >= 70) strengths.push('Taux de succès élevé sur les projets précédents');
    if (rating >= 4.5) strengths.push('Excellents feedbacks clients');
    if (activity < 0.3) gaps.push('Activité récente limitée, à actualiser');

    const actions = gaps.length
      ? [
          {
            label: 'Ajouter des retours récents ou projets terminés pour renforcer la crédibilité',
            impact: 0.1,
            effort: 0.25,
            eta: '1-2 heures',
          },
        ]
      : [];

    return {
      key: 'experience',
      score: Number(Math.min(1, composite).toFixed(3)),
      confidence: this.computeConfidence(input),
      strengths,
      gaps,
      actions,
      debug: {
        successRate,
        rating,
        activity,
        projectAcceptance,
        projectRating,
        historicalSimilarity,
        goalsAlignment,
      },
    };
  }

  private computeConfidence(input: ExperienceScoreInput): number {
    let confidence = 0.3;
    if (input.profileSuccessRate != null) confidence += 0.25;
    if (input.profileAverageRating != null) confidence += 0.15;
    if (input.profileActivityScore != null) confidence += 0.1;
    if (input.projectAcceptanceRate != null || input.projectAverageRating != null) confidence += 0.1;
    if (input.historicalSimilarity != null) confidence += 0.05;
    if (input.goalsAlignment != null) confidence += 0.05;
    return Math.min(1, confidence);
  }
}
