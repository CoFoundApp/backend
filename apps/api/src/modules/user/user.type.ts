import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { UserRole, UserStatus } from '../../common/enums/domain.enums';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => UserStatus)
  status!: UserStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  last_login_at?: Date | null;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}
