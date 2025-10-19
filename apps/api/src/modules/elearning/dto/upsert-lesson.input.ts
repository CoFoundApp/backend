import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { PublishStatus } from '../elearning.enums';

@InputType()
export class UpsertLessonInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsUUID()
  sectionId!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  slug!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(240)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  summary?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  gatedByQuiz?: boolean | null;

  @Field(() => PublishStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  archetype?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  resources?: Record<string, any> | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  objectives?: string | null;
}
