import { Field, InputType, Int, Float } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { MatchMode } from './match-mode.enum';
import { MatchFiltersInput } from './match-filters.input';
import { MatchDetailLevel } from './match-detail-level.enum';

@InputType()
export class MatchProfilesInput {
  @IsEnum(MatchMode)
  @Field(() => MatchMode)
  mode!: MatchMode;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  text?: string;

  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u, {
    message: 'profileId must be a UUID',
  })
  @Field(() => String, { nullable: true })
  projectId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { defaultValue: 20 })
  k = 20;

  @IsOptional()
  @IsNumber()
  @Field(() => Float, { nullable: true })
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  efSearch?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchFiltersInput)
  @Field(() => MatchFiltersInput, { nullable: true })
  filters?: MatchFiltersInput;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  cursor?: string;

  @IsOptional()
  @IsEnum(MatchDetailLevel)
  @Field(() => MatchDetailLevel, { nullable: true })
  detailLevel?: MatchDetailLevel;
}
