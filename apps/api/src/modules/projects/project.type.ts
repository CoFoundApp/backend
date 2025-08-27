import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ProjectStatus, ProjectStage, ProfileVisibility } from '../../common/enums/domain.enums';

@ObjectType()
export class Project {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  owner_id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => ProjectStatus)
  status!: ProjectStatus;

  @Field(() => ProjectStage)
  stage!: ProjectStage;

  @Field(() => ProfileVisibility)
  visibility!: ProfileVisibility;

  @Field(() => [String])
  project_skills!: string[];

  @Field(() => [String])
  project_interests!: string[];

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}
