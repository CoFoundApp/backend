import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from '../interfaces/dimension-score.interface';
import { CultureScoreInput } from '../interfaces/culture.interface';

const overlapRatio = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const item of setA) {
    if (setB.has(item)) inter += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
};

@Injectable()
export class CultureScoreService {
  async evaluate(input: CultureScoreInput): Promise<DimensionScoreResult> {
    const { profileValues, projectValues, profileWorkStyles, projectWorkStyles, preferredEnvironments, projectEnvironment } = input;

    const valueAlignment = overlapRatio(profileValues, projectValues);
    const styleAlignment = overlapRatio(profileWorkStyles, projectWorkStyles);
    const environmentMatch = projectEnvironment && preferredEnvironments.length
      ? preferredEnvironments.includes(projectEnvironment)
        ? 1
        : 0.3
      : 0.5;

    const raw = 0.45 * valueAlignment + 0.35 * styleAlignment + 0.2 * environmentMatch;
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (valueAlignment >= 0.6) {
      strengths.push('Valeurs et culture très alignées');
    } else if (valueAlignment < 0.3 && projectValues.length) {
      gaps.push('Valeurs du projet peu représentées dans le profil');
    }

    if (styleAlignment >= 0.6) {
      strengths.push('Style de travail compatible avec l’équipe');
    } else if (styleAlignment < 0.3 && projectWorkStyles.length) {
      gaps.push('Style de travail à clarifier ou ajuster');
    }

    if (environmentMatch < 0.5 && projectEnvironment) {
      gaps.push('Environnement cible différent des préférences déclarées');
    } else if (environmentMatch >= 0.9 && projectEnvironment) {
      strengths.push('Environnement préféré parfaitement aligné');
    }

    const confidence = this.computeConfidence(input);

    return {
      key: 'culture',
      score: Number(raw.toFixed(3)),
      confidence,
      strengths,
      gaps,
      actions: gaps.length
        ? [
            {
              label: 'Compléter les informations culturelles du profil (valeurs, modes de travail)',
              impact: 0.15,
              effort: 0.2,
              eta: '15 minutes',
            },
          ]
        : [],
      debug: {
        valueAlignment,
        styleAlignment,
        environmentMatch,
      },
    };
  }

  private computeConfidence(input: CultureScoreInput): number {
    let score = 0.2;
    if (input.profileValues.length && input.projectValues.length) score += 0.3;
    if (input.profileWorkStyles.length && input.projectWorkStyles.length) score += 0.3;
    if (input.preferredEnvironments.length && input.projectEnvironment) score += 0.2;
    return Math.min(1, score);
  }
}
