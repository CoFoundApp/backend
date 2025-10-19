import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MatchDetailLevel } from './match-detail-level.enum';
import { MatchEntityType } from './match-entity-type.enum';

@InputType()
export class MatchExplanationFilterInput {
  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  profileId?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  projectId?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  counterpartProfileId?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  counterpartProjectId?: string;

  @IsOptional()
  @IsEnum(MatchEntityType)
  @Field(() => MatchEntityType, { nullable: true })
  entityType?: MatchEntityType;

  @IsOptional()
  @IsEnum(MatchDetailLevel)
  @Field(() => MatchDetailLevel, { nullable: true })
  detailLevel?: MatchDetailLevel;
}
