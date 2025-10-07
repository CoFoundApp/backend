import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './../../../infra/prisma/prisma.service';
import { DimensionKey, DimensionScoreResult } from './dimension-score.interface';

const MODEL_TYPE_SUCCESS = 'success_probability';
const DIMENSION_ORDER: DimensionKey[] = ['technical', 'culture', 'team', 'logistics', 'experience', 'semantic'];

const FEATURE_NAMES: string[] = (() => {
  const base: string[] = [];
  for (const key of DIMENSION_ORDER) {
    base.push(`${key}_score`);
    base.push(`${key}_confidence`);
    base.push(`${key}_weight`);
  }
  base.push('chemistry_score');
  base.push('average_score');
  base.push('average_confidence');
  base.push('average_weight');
  base.push('score_variance');
  return base;
})();

interface TrainingSample {
  features: number[];
  label: number;
}

interface CachedModel {
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

const MIN_SAMPLE_SIZE = 40;
const MAX_SAMPLES = 5000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

type MatchStatus =
  | 'unknown'
  | 'viewed'
  | 'applied'
  | 'interviewing'
  | 'hired'
  | 'completed'
  | 'rejected'
  | 'withdrawn';

@Injectable()
export class SuccessPredictionService {
  private readonly logger = new Logger(SuccessPredictionService.name);
  private cache: CachedModel | null = null;
  private lastCheckedAt = 0;
  private trainingInProgress = false;

  constructor(private readonly prisma: PrismaService) {}

  async predict(input: SuccessPredictionInput): Promise<SuccessPredictionResult> {
    const vector = this.buildFeatureVectorFromResults(input.dimensionResults, input.chemistryScore);
    const model = await this.ensureModel();

    if (!model) {
      const fallbackProbability = this.computeFallbackProbability(input.dimensionResults, input.chemistryScore);
      const fallbackConfidence = this.computeFallbackConfidence(input.dimensionResults);
      return {
        probability: fallbackProbability,
        confidence: fallbackConfidence,
        modelVersion: null,
      };
    }

    const aligned = this.alignFeatures(model.featureNames, vector);
    const probability = this.sigmoid(this.dot(model.weights, aligned) + model.bias);
    return {
      probability: Number(probability.toFixed(3)),
      confidence: Number((model.confidence ?? this.computeFallbackConfidence(input.dimensionResults)).toFixed(3)),
      modelVersion: model.version,
    };
  }

  async triggerTrainingIfNeeded(): Promise<void> {
    const now = Date.now();
    if (this.trainingInProgress) return;
    if (now - this.lastCheckedAt < CHECK_INTERVAL_MS) return;
    this.lastCheckedAt = now;
    const cached = await this.loadLatestModel();
    if (cached && now - cached.trainedAt.getTime() < 6 * 60 * 60 * 1000) {
      return;
    }
    await this.trainFromHistory();
  }

  private async ensureModel(): Promise<CachedModel | null> {
    const cached = await this.loadLatestModel();
    if (cached) return cached;
    await this.trainFromHistory();
    return this.cache;
  }

  private async loadLatestModel(): Promise<CachedModel | null> {
    if (this.cache) {
      return this.cache;
    }
    const now = Date.now();
    if (now - this.lastCheckedAt < CHECK_INTERVAL_MS) {
      return null;
    }
    this.lastCheckedAt = now;
    const row = await this.prisma.prisma().matching_models.findFirst({
      where: { model_type: MODEL_TYPE_SUCCESS, is_active: true },
      orderBy: { trained_at: 'desc' },
    });
    if (!row) return null;
    const weights = this.parseNumberArray(row.coefficients);
    if (!weights.length) return null;
    const featureNames = Array.isArray(row.feature_names) ? (row.feature_names as string[]) : FEATURE_NAMES;
    this.cache = {
      id: row.id,
      version: row.version,
      weights,
      bias: row.bias ?? 0,
      confidence: row.confidence ?? 0.5,
      featureNames,
      sampleSize: row.sample_size ?? 0,
      trainedAt: row.trained_at ?? row.updated_at ?? new Date(),
    };
    return this.cache;
  }

  private async trainFromHistory(): Promise<void> {
    if (this.trainingInProgress) return;
    this.trainingInProgress = true;
    try {
      const samples = await this.fetchSamples();
      if (samples.length < MIN_SAMPLE_SIZE) {
        this.logger.debug(`Not enough samples to train success model (${samples.length}/${MIN_SAMPLE_SIZE}).`);
        return;
      }
      const { weights, bias, loss, accuracy, iterations } = this.runGradientDescent(samples, FEATURE_NAMES.length);
      const roundedWeights = weights.map((w) => Number(w.toFixed(6)));
      const roundedBias = Number(bias.toFixed(6));
      const confidence = Number(accuracy.toFixed(3));
      const version = `lr-${Date.now()}`;

      const payload: Prisma.JsonObject = {
        loss: Number(loss.toFixed(6)),
        accuracy: Number(accuracy.toFixed(4)),
        iterations,
        sampleSize: samples.length,
      };

      const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.matching_models.updateMany({
          where: { model_type: MODEL_TYPE_SUCCESS },
          data: { is_active: false },
        });
        return tx.matching_models.create({
          data: {
            model_type: MODEL_TYPE_SUCCESS,
            version,
            feature_names: FEATURE_NAMES,
            coefficients: roundedWeights as Prisma.InputJsonValue,
            bias: roundedBias,
            confidence,
            sample_size: samples.length,
            training_metrics: payload,
            trained_at: new Date(),
            is_active: true,
          },
        });
      });

      this.cache = {
        id: created.id,
        version: created.version,
        weights: roundedWeights,
        bias: roundedBias,
        confidence,
        featureNames: FEATURE_NAMES,
        sampleSize: samples.length,
        trainedAt: created.trained_at ?? new Date(),
      };
      this.logger.log(`Trained success probability model ${created.version} (accuracy=${confidence}).`);
    } catch (error) {
      this.logger.warn(`Unable to train success probability model: ${(error as Error).message}`);
    } finally {
      this.trainingInProgress = false;
    }
  }

  private async fetchSamples(): Promise<TrainingSample[]> {
    const rows = await this.prisma.prisma().$queryRawUnsafe<Array<{
      dimension_scores: Prisma.JsonValue;
      chemistry_score: number | null;
      status: MatchStatus;
    }>>(`
      SELECT me.dimension_scores, me.chemistry_score, mo.status
      FROM match_outcomes mo
      INNER JOIN match_explanations me ON me.id = mo.match_explanation_id
      WHERE mo.match_explanation_id IS NOT NULL
        AND me.dimension_scores IS NOT NULL
        AND me.chemistry_score IS NOT NULL
        AND mo.status IN ('completed','hired','rejected','withdrawn')
      ORDER BY mo.updated_at DESC
      LIMIT $1::int
    `, MAX_SAMPLES);

    const samples: TrainingSample[] = [];
    for (const row of rows) {
      const featureVector = this.buildFeatureVectorFromStored(row.dimension_scores, row.chemistry_score ?? 0);
      if (!featureVector) continue;
      const label = row.status === 'completed' || row.status === 'hired' ? 1 : 0;
      samples.push({ features: featureVector, label });
    }
    return samples;
  }

  private runGradientDescent(
    samples: TrainingSample[],
    featureCount: number,
  ): { weights: number[]; bias: number; loss: number; accuracy: number; iterations: number } {
    const learningRate = 0.3;
    const regularisation = 0.01;
    const maxIterations = 250;
    const weights = new Array(featureCount).fill(0);
    let bias = 0;
    let loss = 0;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const gradients = new Array(featureCount).fill(0);
      let biasGradient = 0;
      loss = 0;

      for (const sample of samples) {
        const prediction = this.sigmoid(this.dot(weights, sample.features) + bias);
        const error = prediction - sample.label;
        for (let i = 0; i < featureCount; i += 1) {
          gradients[i] += error * sample.features[i];
        }
        biasGradient += error;
        loss += -sample.label * Math.log(Math.max(prediction, 1e-12)) - (1 - sample.label) * Math.log(Math.max(1 - prediction, 1e-12));
      }

      for (let i = 0; i < featureCount; i += 1) {
        const regularised = gradients[i] / samples.length + regularisation * weights[i];
        weights[i] -= learningRate * regularised;
      }
      bias -= learningRate * (biasGradient / samples.length);

      loss /= samples.length;
      if (loss < 0.05) {
        const accuracy = this.computeAccuracy(weights, bias, samples);
        return { weights, bias, loss, accuracy, iterations: iteration + 1 };
      }
    }

    const accuracy = this.computeAccuracy(weights, bias, samples);
    return { weights, bias, loss, accuracy, iterations: maxIterations };
  }

  private computeAccuracy(weights: number[], bias: number, samples: TrainingSample[]): number {
    if (!samples.length) return 0;
    let correct = 0;
    for (const sample of samples) {
      const prediction = this.sigmoid(this.dot(weights, sample.features) + bias);
      const predicted = prediction >= 0.5 ? 1 : 0;
      if (predicted === sample.label) correct += 1;
    }
    return correct / samples.length;
  }

  private buildFeatureVectorFromResults(dimensions: DimensionScoreResult[], chemistry: number): number[] {
    const map: Partial<Record<DimensionKey, { score: number; confidence: number; weight: number }>> = {};
    for (const dimension of dimensions) {
      map[dimension.key] = {
        score: Number.isFinite(dimension.score) ? dimension.score : 0,
        confidence: Number.isFinite(dimension.confidence) ? dimension.confidence : 0,
        weight: Number.isFinite(dimension.weight ?? 0) ? dimension.weight ?? 0 : 0,
      };
    }
    return this.buildFeatureVector(map, chemistry);
  }

  private buildFeatureVectorFromStored(
    payload: Prisma.JsonValue,
    chemistryScore: number,
  ): number[] | null {
    if (!payload || !Array.isArray(payload)) return null;
    const map: Partial<Record<DimensionKey, { score: number; confidence: number; weight: number }>> = {};
    for (const entry of payload as Array<Record<string, any>>) {
      const key = entry?.key as DimensionKey | undefined;
      if (!key || !DIMENSION_ORDER.includes(key)) continue;
      map[key] = {
        score: typeof entry?.score === 'number' ? entry.score : 0,
        confidence: typeof entry?.confidence === 'number' ? entry.confidence : 0,
        weight: typeof entry?.weight === 'number' ? entry.weight : 0,
      };
    }
    return this.buildFeatureVector(map, chemistryScore);
  }

  private buildFeatureVector(
    map: Partial<Record<DimensionKey, { score: number; confidence: number; weight: number }>>,
    chemistryScore: number,
  ): number[] {
    const vector: number[] = [];
    const scores: number[] = [];
    const confidences: number[] = [];
    const weights: number[] = [];

    for (const key of DIMENSION_ORDER) {
      const entry = map[key] ?? { score: 0, confidence: 0, weight: 0 };
      vector.push(this.clamp(entry.score));
      vector.push(this.clamp(entry.confidence));
      vector.push(this.clamp(entry.weight));
      scores.push(this.clamp(entry.score));
      confidences.push(this.clamp(entry.confidence));
      weights.push(this.clamp(entry.weight));
    }

    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    const avgWeight = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const variance = scores.length
      ? scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length
      : 0;

    vector.push(this.clamp(chemistryScore));
    vector.push(this.clamp(avgScore));
    vector.push(this.clamp(avgConfidence));
    vector.push(this.clamp(avgWeight));
    vector.push(this.clamp(Math.sqrt(variance)));

    return vector;
  }

  private alignFeatures(featureNames: string[], values: number[]): number[] {
    if (featureNames.length === values.length) return values;
    const aligned: number[] = [];
    for (let i = 0; i < featureNames.length; i += 1) {
      aligned.push(values[i] ?? 0);
    }
    return aligned;
  }

  private computeFallbackProbability(dimensions: DimensionScoreResult[], chemistry: number): number {
    if (!dimensions.length) return Number(this.sigmoid(chemistry * 2 - 1).toFixed(3));
    const avgScore = dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length;
    const combined = 0.7 * avgScore + 0.3 * chemistry;
    return Number(Math.min(0.98, Math.max(0.02, combined)).toFixed(3));
  }

  private computeFallbackConfidence(dimensions: DimensionScoreResult[]): number {
    if (!dimensions.length) return 0.5;
    const avgConfidence = dimensions.reduce((acc, d) => acc + d.confidence, 0) / dimensions.length;
    return Number(Math.min(0.95, Math.max(0.1, avgConfidence)).toFixed(3));
  }

  private parseNumberArray(value: Prisma.JsonValue): number[] {
    if (Array.isArray(value)) {
      return value.map((entry) => (typeof entry === 'number' ? entry : Number(entry ?? 0))).filter((val) => Number.isFinite(val));
    }
    if (value && typeof value === 'object' && Array.isArray((value as any).values)) {
      return ((value as any).values as any[])
        .map((entry) => (typeof entry === 'number' ? entry : Number(entry ?? 0)))
        .filter((val) => Number.isFinite(val));
    }
    return [];
  }

  private dot(weights: number[], features: number[]): number {
    let sum = 0;
    const limit = Math.min(weights.length, features.length);
    for (let i = 0; i < limit; i += 1) {
      sum += weights[i] * features[i];
    }
    return sum;
  }

  private sigmoid(value: number): number {
    return 1 / (1 + Math.exp(-value));
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value > 1) return 1;
    if (value < -1) return -1;
    return Number(value);
  }
}
