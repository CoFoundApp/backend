import { InputType, Field, Int, registerEnumType, ObjectType, Float } from '@nestjs/graphql';
import { ProjectStage, ProjectStatus } from '../../../common/enums/domain.enums';
import { Project } from '../project.type';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ProjectListSortBy {
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  TITLE = 'TITLE',
}
registerEnumType(ProjectListSortBy, { name: 'ProjectListSortBy' });

@InputType()
export class ProjectListFiltersInput {
  @Field(() => [ProjectStage], { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStage, { each: true })
  stages?: ProjectStage[];

  @Field(() => [ProjectStatus], { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus, { each: true })
  statuses?: ProjectStatus[];

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  createdFrom?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  createdTo?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  updatedFrom?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  updatedTo?: Date;
}

@InputType()
export class ProjectListSortInput {
  @Field(() => ProjectListSortBy, { defaultValue: ProjectListSortBy.CREATED_AT })
  @IsEnum(ProjectListSortBy)
  by!: ProjectListSortBy;

  @Field({ defaultValue: 'desc' })
  @IsEnum(['asc', 'desc'])
  direction!: 'asc' | 'desc';
}

@InputType()
export class ProjectListPageInput {
  @Field(() => Int, { defaultValue: 1 })
  page!: number;

  @Field(() => Int, { defaultValue: 20 })
  pageSize!: number;
}

@ObjectType()
export class ProjectListResult {
  @Field(() => [Project])
  items!: Project[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}
