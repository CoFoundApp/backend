import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Project } from '../../projects/project.type';
import { MatchDetailLevel } from './match-detail-level.enum';
import {
  DimensionScore,
  MatchForceType,
  MatchGapType,
  MatchRecommendationActionType,
  CompetitiveInsightType,
  BidirectionalInsightType,
  ChemistryInsightType,
  ContactPlanStepType,
} from './match-explainability.type';

@ObjectType()
export class ProjectMatch {
  @Field(() => Project)
  project!: Project;

  @Field(() => Float)
  distance!: number;

  @Field(() => Float)
  score!: number;

  @Field(() => Float)
  confidence!: number;

  @Field(() => Float)
  successProbability!: number;

  @Field(() => Float)
  successConfidence!: number;

  @Field(() => String, { nullable: true })
  successModelVersion?: string | null;

  @Field(() => MatchDetailLevel)
  detailLevel!: MatchDetailLevel;

  @Field(() => [DimensionScore])
  dimensionScores!: DimensionScore[];

  @Field(() => [MatchForceType])
  forces!: MatchForceType[];

  @Field(() => [MatchGapType])
  gaps!: MatchGapType[];

  @Field(() => [MatchRecommendationActionType])
  recommendations!: MatchRecommendationActionType[];

  @Field(() => ChemistryInsightType)
  chemistry!: ChemistryInsightType;

  @Field(() => CompetitiveInsightType, { nullable: true })
  competitive?: CompetitiveInsightType | null;

  @Field(() => BidirectionalInsightType, { nullable: true })
  bidirectional?: BidirectionalInsightType | null;

  @Field(() => [ContactPlanStepType])
  contactPlan!: ContactPlanStepType[];
}
