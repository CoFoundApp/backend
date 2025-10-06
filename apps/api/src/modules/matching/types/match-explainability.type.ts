import { ObjectType, Field, Float } from '@nestjs/graphql';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { MatchDetailLevel } from './match-detail-level.enum';

@ObjectType()
export class DimensionScore {
  @Field()
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
  @Field()
  dimension!: string;

  @Field()
  label!: string;

  @Field()
  description!: string;
}

@ObjectType()
export class MatchGapType {
  @Field()
  dimension!: string;

  @Field()
  label!: string;

  @Field()
  description!: string;

  @Field(() => Float)
  impact!: number;
}

@ObjectType()
export class MatchRecommendationActionType {
  @Field()
  dimension!: string;

  @Field()
  label!: string;

  @Field(() => Float)
  impact!: number;

  @Field(() => Float)
  effort!: number;

  @Field({ nullable: true })
  eta?: string | null;

  @Field(() => MatchDetailLevel, { nullable: true })
  detailLevel?: MatchDetailLevel | null;

  @Field(() => Float)
  priority!: number;
}

@ObjectType()
export class CompetitiveInsightType {
  @Field({ nullable: true })
  rank?: number | null;

  @Field(() => Float, { nullable: true })
  percentile?: number | null;

  @Field({ nullable: true })
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

  @Field({ nullable: true })
  modelVersion?: string | null;

  @Field(() => [String])
  notes!: string[];
}

@ObjectType()
export class ContactPlanStepType {
  @Field()
  title!: string;

  @Field()
  description!: string;
}
