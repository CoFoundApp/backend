import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Conversation, Message, MessageConnection } from './conversation.type';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Inject } from '@nestjs/common';
import { PUB_SUB } from './conversation.constants';
import { PubSubEngine } from 'graphql-subscriptions';

@Resolver(() => Conversation)
export class ConversationResolver {
  constructor(
    private readonly conversations: ConversationService,
    @Inject(PUB_SUB) private readonly pubsub: PubSubEngine,
  ) {}

  @UseGuards(SessionGuard)
  @Query(() => [Conversation], { description: 'List my conversations' })
  async conversationsQuery(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.conversations.listConversations(user.sub);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Conversation, { description: 'Create or return existing DM conversation' })
  async createConversation(
    @CurrentUser() user: JwtUser,
    @Args('user_id', { type: () => String }) user_id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.conversations.createConversation(user.sub, user_id);
  }

  @UseGuards(SessionGuard)
  @Query(() => MessageConnection, { description: 'List messages of a conversation' })
  async messages(
    @CurrentUser() user: JwtUser,
    @Args('conversation_id', { type: () => String }) conversation_id: string,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.conversations.listMessages(user.sub, conversation_id, limit ?? 20, cursor);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Message, { description: 'Send a message' })
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Args('conversation_id', { type: () => String }) conversation_id: string,
    @Args('content', { type: () => String }) content: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.conversations.sendMessage(user.sub, conversation_id, content);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Mark a conversation as read' })
  async markConversationRead(
    @CurrentUser() user: JwtUser,
    @Args('conversation_id', { type: () => String }) conversation_id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.conversations.markRead(user.sub, conversation_id);
  }

  @UseGuards(SessionGuard)
  @Subscription(() => Message, {
    filter: (payload, variables) => payload.messageAdded.conversation_id === variables.conversation_id,
  })
  async messageAdded(
    @Args('conversation_id', { type: () => String }) conversation_id: string,
    @CurrentUser() user: JwtUser,
  ) {
    if (!user) throw new UnauthorizedException();
    const ok = await this.conversations.isParticipant(conversation_id, user.sub);
    if (!ok) throw new ForbiddenException('Not a participant');
    return this.pubsub.asyncIterableIterator<Message>(`messageAdded:${conversation_id}`);
  }
}
