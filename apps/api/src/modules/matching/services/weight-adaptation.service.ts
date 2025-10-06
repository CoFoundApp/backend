import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CompositeScoreContext, DimensionKey, WeightingScheme } from './dimension-score.interface';

const DIMENSION_ORDER: DimensionKey[] = ['technical', 'culture', 'team', 'logistics', 'experience', 'semantic'];

const DEFAULT_WEIGHTS: Record<DimensionKey, number> = {
  technical: 0.3,
  culture: 0.15,
  team: 0.1,
  logistics: 0.15,
  experience: 0.15,
  semantic: 0.15,
};

@Injectable()
export class WeightAdaptationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveWeights(context: {
    sector?: string | null;
    projectType?: string | null;
    urgency?: string | null;
  }): Promise<CompositeScoreContext> {
    const { sector, projectType, urgency } = context;
    const candidates = await this.prisma.prisma().algorithm_weights.findMany({
      where: {
        is_active: true,
        OR: [
          {
            sector: sector ?? null,
            project_type: projectType ?? null,
            urgency: urgency ? (urgency as Prisma.urgency_level) : undefined,
          },
          {
            sector: sector ?? null,
            project_type: null,
            urgency: null,
          },
        ],
      },
      orderBy: [
        { confidence: 'desc' },
        { updated_at: 'desc' },
      ],
      take: 1,
    });

    const scheme: WeightingScheme[] = [];
    if (candidates.length === 0) {
      for (const key of DIMENSION_ORDER) {
        scheme.push({ key, weight: DEFAULT_WEIGHTS[key], confidence: 0.2 });
      }
      return { weights: scheme, totalWeight: this.sumWeights(scheme) };
    }

    const { confidence, dimension_technical, dimension_culture, dimension_team, dimension_logistics, dimension_experience, dimension_semantic } = candidates[0];

    const rawWeights: Record<DimensionKey, number> = {
      technical: dimension_technical ?? DEFAULT_WEIGHTS.technical,
      culture: dimension_culture ?? DEFAULT_WEIGHTS.culture,
      team: dimension_team ?? DEFAULT_WEIGHTS.team,
      logistics: dimension_logistics ?? DEFAULT_WEIGHTS.logistics,
      experience: dimension_experience ?? DEFAULT_WEIGHTS.experience,
      semantic: dimension_semantic ?? DEFAULT_WEIGHTS.semantic,
    };

    const normalised = this.normalise(rawWeights);
    for (const key of DIMENSION_ORDER) {
      scheme.push({ key, weight: normalised[key], confidence: confidence ?? 0.5 });
    }

    return { weights: scheme, totalWeight: this.sumWeights(scheme) };
  }

  private sumWeights(weights: WeightingScheme[]): number {
    return weights.reduce((acc, w) => acc + w.weight, 0);
  }

  private normalise(weights: Record<DimensionKey, number>): Record<DimensionKey, number> {
    const sum = Object.values(weights).reduce((acc, v) => acc + (v > 0 ? v : 0), 0);
    if (!sum) {
      return { ...DEFAULT_WEIGHTS };
    }
    const normalised: Partial<Record<DimensionKey, number>> = {};
    for (const key of Object.keys(weights) as DimensionKey[]) {
      const val = weights[key];
      normalised[key] = val > 0 ? val / sum : DEFAULT_WEIGHTS[key];
    }
    return normalised as Record<DimensionKey, number>;
  }
}
