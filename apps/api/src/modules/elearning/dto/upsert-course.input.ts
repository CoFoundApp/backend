import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel, CourseVisibility, PublishStatus } from '../elearning.enums';

@InputType()
export class UpsertCourseInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  @MaxLength(140)
  slug!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  coverUrl?: string | null;

  @Field(() => CourseLevel, { nullable: true })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @Field(() => CourseVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(CourseVisibility)
  visibility?: CourseVisibility;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  language?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  track?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  objectives?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  outcomes?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  prerequisiteCourseId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  ownerOrgId?: string | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reviewNotes?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @Field(() => PublishStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}
