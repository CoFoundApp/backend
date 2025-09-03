import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { JSONScalar } from '../../common/scalars/json.scalar';
import { NotificationType, EmailFrequency } from '../../common/enums/domain.enums';

@ObjectType()
export class Notification {
  @Field(() => ID)
  id!: string;

  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => Boolean)
  is_read!: boolean;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => String, { nullable: true })
  project_id?: string | null;

  @Field(() => String, { nullable: true })
  actor_id?: string | null;

  @Field(() => String, { nullable: true })
  subject_id?: string | null;

  @Field(() => JSONScalar)
  payload!: Record<string, any>;

  @Field(() => [String])
  channels!: string[];
}

@ObjectType()
export class NotificationConnection {
  @Field(() => [Notification])
  items!: Notification[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}

@ObjectType()
export class NotificationPreference {
  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => Boolean)
  site_enabled!: boolean;

  @Field(() => EmailFrequency)
  email_frequency!: EmailFrequency;

  @Field(() => String, { nullable: true })
  quiet_hours_start?: string | null;

  @Field(() => String, { nullable: true })
  quiet_hours_end?: string | null;
}
