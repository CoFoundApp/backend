import { Field, GraphQLISODateTime, ID, ObjectType } from "@nestjs/graphql";
import { User } from "../user/user.type";

@ObjectType()
export class ConversationParticipant {
  @Field(() => ID)
  user_id!: string;

  @Field(() => String)
  role!: string;

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
  type!: string;

  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => ID, { nullable: true })
  reply_to_id?: string;

  @Field(() => Boolean)
  is_read!: boolean;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
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

  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => ID)
  created_by!: string;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  last_message_at?: Date | null;

  @Field(() => Message, { nullable: true })
  last_message?: Message | null;

  @Field(() => Number)
  messages_count!: number;

  @Field(() => [ConversationParticipant])
  participants!: ConversationParticipant[];
}
