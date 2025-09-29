import { InputType, Field, Int, registerEnumType, ObjectType } from '@nestjs/graphql';
import { ProjectStage, ProjectStatus, ProfileVisibility } from '../../../common/enums/domain.enums';
import { Project } from '../project.type';

export enum ProjectListSortBy {
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  TITLE = 'TITLE',
}
registerEnumType(ProjectListSortBy, { name: 'ProjectListSortBy' });

@InputType()
export class ProjectListFiltersInput {
  @Field(() => [ProfileVisibility], { nullable: true })
  visibilities?: ProfileVisibility[]; // défaut: ['public','unlisted']

  @Field(() => [ProjectStage], { nullable: true })
  stages?: ProjectStage[];

  @Field(() => [ProjectStatus], { nullable: true })
  statuses?: ProjectStatus[];

  @Field(() => [String], { nullable: true })
  industries?: string[];

  @Field(() => [String], { nullable: true })
  tagsAny?: string[];       // au moins un des tags

  @Field(() => [String], { nullable: true })
  skillsAny?: string[];     // au moins une skill

  @Field(() => [String], { nullable: true })
  skillsAll?: string[];     // doit contenir toutes ces skills

  @Field(() => [String], { nullable: true })
  interestsAny?: string[];

  @Field(() => [String], { nullable: true })
  ownerIds?: string[];

  @Field({ nullable: true })
  createdFrom?: Date;

  @Field({ nullable: true })
  createdTo?: Date;

  @Field({ nullable: true })
  updatedFrom?: Date;

  @Field({ nullable: true })
  updatedTo?: Date;

  @Field({ nullable: true })
  hasAttachment?: boolean;

  @Field({ nullable: true })
  hasBanner?: boolean;

  @Field({ nullable: true })
  hasAvatar?: boolean;
}

@InputType()
export class ProjectListSortInput {
  @Field(() => ProjectListSortBy, { defaultValue: ProjectListSortBy.CREATED_AT })
  by!: ProjectListSortBy;

  @Field({ defaultValue: 'desc' })
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
