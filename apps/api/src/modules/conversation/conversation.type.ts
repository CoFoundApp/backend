import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { User } from '../user/user.type';

@ObjectType()
export class ConversationParticipant {
  @Field(() => ID)
  user_id!: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  last_read_at?: Date | null;

  @Field(() => User)
  user!: User;
}

@ObjectType()
export class Message {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  conversation_id!: string;

  @Field(() => ID)
  sender_id!: string;

  @Field(() => String)
  content!: string;

  @Field(() => Boolean)
  is_read!: boolean;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;
}

@ObjectType()
export class MessageConnection {
  @Field(() => [Message])
  items!: Message[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}

@ObjectType()
export class Conversation {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;

  @Field(() => Message, { nullable: true })
  last_message_at?: Message | null;

  @Field(() => [ConversationParticipant])
  participants!: ConversationParticipant[];
}
