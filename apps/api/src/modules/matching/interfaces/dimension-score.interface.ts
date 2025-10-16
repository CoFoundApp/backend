import { MatchDetailLevel } from '../types/match-detail-level.enum';

export type DimensionKey =
  | 'technical'
  | 'culture'
  | 'team'
  | 'logistics'
  | 'experience'
  | 'semantic';

export interface DimensionScoreResult {
  key: DimensionKey;
  score: number;
  confidence: number;
  weight?: number;
  strengths: string[];
  gaps: string[];
  actions: MatchImprovementAction[];
  debug?: Record<string, any>;
}

export interface MatchImprovementAction {
  label: string;
  impact: number;
  effort: number;
  eta?: string;
  detailLevel?: MatchDetailLevel;
}

export interface WeightingScheme {
  key: DimensionKey;
  weight: number;
  confidence: number;
}

export interface CompositeScoreContext {
  weights: WeightingScheme[];
  totalWeight: number;
}
