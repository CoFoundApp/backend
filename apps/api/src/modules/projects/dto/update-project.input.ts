import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, IsEnum, IsArray } from 'class-validator';
import { ProjectStatus, ProjectStage, ProfileVisibility } from '../../../common/enums/domain.enums';

@InputType()
export class UpdateProjectInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  summary?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  industry?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @Field(() => ProjectStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus | null;

  @Field(() => ProjectStage, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage | null;

  @Field(() => ProfileVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibility?: ProfileVisibility | null;
}
