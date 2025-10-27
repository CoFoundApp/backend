import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { QuestionType } from '../elearning.enums';

@InputType()
export class UpsertQuestionInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsUUID()
  quizId!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(800)
  prompt!: string;

  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type!: QuestionType;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  options?: Record<string, any> | null;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  answer?: Record<string, any> | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number | null;
}
