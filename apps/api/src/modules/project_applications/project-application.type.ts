import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ApplicationStatus } from '../../common/enums/domain.enums';
import { ProjectPosition } from '../project-position/project-position.type';

@ObjectType()
export class ProjectApplication {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  project_id!: string;

  @Field(() => String)
  applicant_id!: string;

  @Field(() => String, { nullable: true })
  note?: string | null;

  @Field(() => [String])
  attachment_urls!: string[];

  @Field(() => String, { nullable: true })
  position_id?: string | null;

  @Field(() => ApplicationStatus)
  status!: ApplicationStatus;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;

  @Field(() => String, { nullable: true })
  decided_by?: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  decided_at?: Date | null;

  @Field(() => ProjectPosition, { nullable: true })
  position?: ProjectPosition | null;
}

@ObjectType()
export class ProjectApplicationList {
  @Field(() => [ProjectApplication])
  items!: ProjectApplication[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}
