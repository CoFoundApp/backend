import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CourseLevel, CourseVisibility, PublishStatus } from '../elearning.enums';

@InputType()
export class CourseFilterInput {
  @Field(() => CourseVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(CourseVisibility)
  visibility?: CourseVisibility;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  authorId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  tag?: string;

  @Field(() => CourseLevel, { nullable: true })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @Field(() => PublishStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  track?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  text?: string;
}

@InputType()
export class CoursePaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
