import { Field, InputType, Int, Float } from '@nestjs/graphql';
import { MatchMode } from './match-mode.enum';
import { MatchFiltersInput } from './match-filters.input';
import { MatchDetailLevel } from './match-detail-level.enum';

@InputType()
export class MatchProjectsInput {
  @Field(() => MatchMode)
  mode!: MatchMode;

  @Field({ nullable: true })
  text?: string;

  @Field({ nullable: true })
  profileId?: string;

  @Field(() => Int, { defaultValue: 20 })
  k = 20;

  @Field(() => Float, { nullable: true })
  threshold?: number;

  @Field(() => Int, { nullable: true })
  efSearch?: number;

  @Field(() => MatchFiltersInput, { nullable: true })
  filters?: MatchFiltersInput;

  @Field({ nullable: true })
  cursor?: string;

  @Field(() => MatchDetailLevel, { nullable: true })
  detailLevel?: MatchDetailLevel;
}
