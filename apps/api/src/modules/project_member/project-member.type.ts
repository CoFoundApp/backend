import { ObjectType, Field, GraphQLISODateTime, ID } from '@nestjs/graphql';
import { MemberRole, MemberStatus, InvitationStatus } from '../../common/enums/domain.enums';

@ObjectType()
export class ProjectMember {
  @Field(() => String)
  project_id!: string;

  @Field(() => String)
  user_id!: string;

  @Field(() => MemberRole)
  role!: MemberRole;

  @Field(() => MemberStatus)
  status!: MemberStatus;

  @Field(() => GraphQLISODateTime, { name: 'created_at' })
  joined_at!: Date;
}

@ObjectType()
export class ProjectInvitation {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  project_id!: string;

  @Field(() => String)
  inviter_id!: string;

  @Field(() => String)
  invitee_id!: string;

  @Field(() => MemberRole)
  role!: MemberRole;

  @Field(() => InvitationStatus)
  status!: InvitationStatus;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  expires_at?: Date | null;
}
