import { Field, Float, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { MatchDetailLevel } from './match-detail-level.enum';
import { MatchEntityType } from './match-entity-type.enum';
import {
  BidirectionalInsightType,
  CompetitiveInsightType,
  ContactPlanStepType,
  DimensionScore,
  MatchForceType,
  MatchGapType,
  MatchRecommendationActionType,
} from './match-explainability.type';

@ObjectType()
export class MatchExplanation {
  @Field(() => String)
  id!: string;

  @Field(() => MatchEntityType)
  entityType!: MatchEntityType;

  @Field(() => String, { nullable: true })
  profileId?: string | null;

  @Field(() => String, { nullable: true })
  projectId?: string | null;

  @Field(() => String, { nullable: true })
  counterpartProfileId?: string | null;

  @Field(() => String, { nullable: true })
  counterpartProjectId?: string | null;

  @Field(() => String)
  algorithmVersion!: string;

  @Field(() => MatchDetailLevel)
  detailLevel!: MatchDetailLevel;

  @Field(() => Float, { nullable: true })
  score?: number | null;

  @Field(() => Float, { nullable: true })
  confidence?: number | null;

  @Field(() => Float, { nullable: true })
  chemistryScore?: number | null;

  @Field(() => Float, { nullable: true })
  successProbability?: number | null;

  @Field(() => Float, { nullable: true })
  successConfidence?: number | null;

  @Field(() => String, { nullable: true })
  successModelVersion?: string | null;

  @Field(() => [DimensionScore])
  dimensionScores!: DimensionScore[];

  @Field(() => [MatchForceType])
  forces!: MatchForceType[];

  @Field(() => [MatchGapType])
  gaps!: MatchGapType[];

  @Field(() => [MatchRecommendationActionType])
  recommendations!: MatchRecommendationActionType[];

  @Field(() => [ContactPlanStepType])
  contactPlan!: ContactPlanStepType[];

  @Field(() => CompetitiveInsightType, { nullable: true })
  competitiveContext?: CompetitiveInsightType | null;

  @Field(() => BidirectionalInsightType, { nullable: true })
  bidirectionalContext?: BidirectionalInsightType | null;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: Record<string, unknown> | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
export class MatchExplanationConnection {
  @Field(() => [MatchExplanation])
  items!: MatchExplanation[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}
