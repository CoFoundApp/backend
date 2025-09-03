import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { PositionStatus } from '../../common/enums/domain.enums';

@ObjectType()
export class ProjectPosition {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  project_id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => PositionStatus)
  status!: PositionStatus;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}
