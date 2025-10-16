import { ObjectType, Field, Float } from '@nestjs/graphql';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { MatchDetailLevel } from './match-detail-level.enum';

@ObjectType()
export class DimensionScore {
  @Field(() => String)
  key!: string;

  @Field(() => Float)
  score!: number;

  @Field(() => Float)
  confidence!: number;

  @Field(() => Float, { nullable: true })
  weight?: number | null;

  @Field(() => [String])
  strengths!: string[];

  @Field(() => [String])
  gaps!: string[];

  @Field(() => JSONScalar, { nullable: true })
  debug?: any;
}

@ObjectType()
export class MatchForceType {
  @Field(() => String)
  dimension!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class MatchGapType {
  @Field(() => String)
  dimension!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Float)
  impact!: number;
}

@ObjectType()
export class MatchRecommendationActionType {
  @Field(() => String)
  dimension!: string;

  @Field(() => String)
  label!: string;

  @Field(() => Float)
  impact!: number;

  @Field(() => Float)
  effort!: number;

  @Field(() => String, { nullable: true })
  eta?: string | null;

  @Field(() => MatchDetailLevel, { nullable: true })
  detailLevel?: MatchDetailLevel | null;

  @Field(() => Float)
  priority!: number;
}

@ObjectType()
export class CompetitiveInsightType {
  @Field(() => Float, { nullable: true })
  rank?: number | null;

  @Field(() => Float, { nullable: true })
  percentile?: number | null;

  @Field(() => Float, { nullable: true })
  totalCandidates?: number | null;

  @Field(() => [String])
  uniqueAdvantages!: string[];

  @Field(() => Float)
  confidence!: number;
}

@ObjectType()
export class BidirectionalInsightType {
  @Field(() => [String])
  forProfile!: string[];

  @Field(() => [String])
  forProject!: string[];
}

@ObjectType()
export class ChemistryInsightType {
  @Field(() => Float)
  score!: number;

  @Field(() => Float)
  successProbability!: number;

  @Field(() => Float)
  successConfidence!: number;

  @Field(() => String, { nullable: true })
  modelVersion?: string | null;

  @Field(() => [String])
  notes!: string[];
}

@ObjectType()
export class ContactPlanStepType {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}
