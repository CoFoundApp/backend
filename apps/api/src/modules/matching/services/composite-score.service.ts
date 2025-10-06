import { Injectable } from '@nestjs/common';
import { MatchDetailLevel } from '../types/match-detail-level.enum';
import { DimensionScoreResult, DimensionKey } from './dimension-score.interface';
import { TechnicalScoreService, TechnicalScoreInput } from './technical-score.service';
import { CultureScoreService, CultureScoreInput } from './culture-score.service';
import { TeamChemistryService, TeamChemistryInput } from './team-chemistry.service';
import { LogisticsScoreService, LogisticsScoreInput } from './logistics-score.service';
import { ExperienceScoreService, ExperienceScoreInput } from './experience-score.service';
import { SemanticScoreService, SemanticScoreInput } from './semantic-score.service';
import {
  ExplainabilityService,
  BidirectionalInsight,
  ExplainabilityPayload,
  ContactContext,
} from './explainability.service';
import { WeightAdaptationService } from './weight-adaptation.service';
import { SuccessPredictionService } from './success-prediction.service';

export interface CompositeScoreInput {
  detailLevel: MatchDetailLevel;
  context: {
    sector?: string | null;
    projectType?: string | null;
    urgency?: string | null;
  };
  technical: TechnicalScoreInput;
  culture: CultureScoreInput;
  team: TeamChemistryInput;
  logistics: LogisticsScoreInput;
  experience: ExperienceScoreInput;
  semantic: SemanticScoreInput;
  contact?: ContactContext;
}

export interface CompositeScoreOutput {
  score: number;
  dimensionResults: DimensionScoreResult[];
  chemistryScore: number;
  successProbability: number;
  successConfidence: number;
  successModelVersion: string | null;
  explainability: ExplainabilityPayload;
}

const DIMENSION_PRIORITY: DimensionKey[] = ['technical', 'culture', 'team', 'logistics', 'experience', 'semantic'];

@Injectable()
export class CompositeScoreService {
  constructor(
    private readonly technical: TechnicalScoreService,
    private readonly culture: CultureScoreService,
    private readonly teamChemistry: TeamChemistryService,
    private readonly logistics: LogisticsScoreService,
    private readonly experience: ExperienceScoreService,
    private readonly semantic: SemanticScoreService,
    private readonly explainability: ExplainabilityService,
    private readonly weights: WeightAdaptationService,
    private readonly successPrediction: SuccessPredictionService,
  ) {}

  async evaluate(input: CompositeScoreInput): Promise<CompositeScoreOutput> {
    const weightContext = await this.weights.resolveWeights(input.context);
    const weightMap = new Map<DimensionKey, number>();
    weightContext.weights.forEach((w) => weightMap.set(w.key, w.weight));

    const [technical, culture, team, logistics, experience, semantic] = await Promise.all([
      this.technical.evaluate(input.technical),
      this.culture.evaluate(input.culture),
      this.teamChemistry.evaluate(input.team),
      this.logistics.evaluate(input.logistics),
      this.experience.evaluate(input.experience),
      this.semantic.evaluate(input.semantic),
    ]);

    const dimensionResults = [technical, culture, team, logistics, experience, semantic];
    dimensionResults.forEach((dimension) => {
      dimension.weight = Number((weightMap.get(dimension.key as DimensionKey) ?? 0).toFixed(3));
    });

    const score = this.computeOverallScore(dimensionResults, weightContext.totalWeight);
    const chemistryScore = Number(((culture.score + team.score + logistics.score) / 3).toFixed(3));
    const successPrediction = await this.successPrediction.predict({
      dimensionResults,
      chemistryScore,
    });
    const successProbability = successPrediction.probability;
    const bidirectional = this.buildBidirectionalInsight(technical, culture, experience, chemistryScore);

    const explainability = this.explainability.buildExplainability({
      dimensionResults,
      detailLevel: input.detailLevel,
      weightContext,
      chemistryScore,
      successProbability,
      successConfidence: successPrediction.confidence,
      successModelVersion: successPrediction.modelVersion,
      bidirectionalNotes: bidirectional,
      contactContext: input.contact,
    });

    return {
      score,
      dimensionResults,
      chemistryScore,
      successProbability,
      successConfidence: successPrediction.confidence,
      successModelVersion: successPrediction.modelVersion,
      explainability,
    };
  }

  private computeOverallScore(results: DimensionScoreResult[], totalWeight: number): number {
    if (!results.length || !totalWeight) return 0;
    const sorted = [...results].sort(
      (a, b) => DIMENSION_PRIORITY.indexOf(a.key as DimensionKey) - DIMENSION_PRIORITY.indexOf(b.key as DimensionKey),
    );
    const weighted = sorted.reduce((acc, dimension) => acc + (dimension.weight ?? 0) * dimension.score, 0);
    return Number((weighted / totalWeight).toFixed(3));
  }

  private buildBidirectionalInsight(
    technical: DimensionScoreResult,
    culture: DimensionScoreResult,
    experience: DimensionScoreResult,
    chemistryScore: number,
  ): BidirectionalInsight {
    const forProfile: string[] = [];
    const forProject: string[] = [];

    if (technical.score >= 0.7) {
      forProfile.push('Projet aligné avec votre stack technique actuelle');
      forProject.push('Compétences immédiatement opérationnelles');
    } else {
      forProfile.push('Opportunité de montée en compétence sur de nouvelles technologies');
    }

    if (experience.score >= 0.7) {
      forProject.push('Historique de réussite rassurant pour l’équipe');
    } else {
      forProfile.push('Projet pour consolider une nouvelle expertise');
    }

    if (culture.score >= 0.7) {
      forProfile.push('Culture et valeurs compatibles avec vos attentes');
    }

    if (chemistryScore >= 0.7) {
      forProject.push('Grande fluidité attendue dans la collaboration');
    }

    return { forProfile, forProject };
  }
}
