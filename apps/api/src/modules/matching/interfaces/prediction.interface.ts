import { DimensionScoreResult } from './dimension-score.interface';

export interface TrainingSample {
  features: number[];
  label: number;
}

export interface CachedModel {
  id: string;
  version: string;
  weights: number[];
  bias: number;
  confidence: number;
  featureNames: string[];
  sampleSize: number;
  trainedAt: Date;
}

export interface SuccessPredictionInput {
  dimensionResults: DimensionScoreResult[];
  chemistryScore: number;
}

export interface SuccessPredictionResult {
  probability: number;
  confidence: number;
  modelVersion: string | null;
}
