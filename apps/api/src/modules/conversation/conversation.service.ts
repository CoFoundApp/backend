import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../../common/enums/domain.enums';
import { REDIS } from '../../infra/redis/redis.module';
import Redis from 'ioredis';
import { PUB_SUB } from './conversation.constants';
import { PubSubEngine } from 'graphql-subscriptions';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(PUB_SUB) private readonly pubsub: PubSubEngine,
  ) {}

  private encodeCursor(m: { created_at: Date; id: string }) {
    return Buffer.from(`${m.created_at.toISOString()}::${m.id}`).toString('base64');
  }

  private decodeCursor(cursor: string) {
    const [date, id] = Buffer.from(cursor, 'base64').toString().split('::');
    return { created_at: new Date(date), id };
  }

  async createConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId)
      throw new BadRequestException('Cannot converse with yourself');

    const existing = await this.prisma.prisma().conversations.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { user_id: userId } } },
          { participants: { some: { user_id: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                profiles: { select: { display_name: true } },
              },
            },
          },
        },
        last_message: true,
      },
    });

    if (existing && existing.participants.length === 2) {
      return {
        ...existing,
        participants: existing.participants.map((p: any) => ({
          conversation_id: p.conversation_id,
          user_id: p.user_id,
          last_read_at: p.last_read_at,
          user: p.users,
        })),
      };
    }

    const conv = await this.prisma.prisma().conversations.create({
      data: {
        type: 'dm',
        created_by: userId,
        participants: {
          createMany: {
            data: [{ user_id: userId }, { user_id: targetUserId }],
          },
        },
      },
      include: {
        participants: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                profiles: { select: { display_name: true } },
              },
            },
          },
        },
        last_message: true,
      },
    });

    return {
      ...conv,
      participants: conv.participants.map((p: any) => ({
        conversation_id: p.conversation_id,
        user_id: p.user_id,
        last_read_at: p.last_read_at,
        user: p.users,
      })),
    };
  }

  async listConversations(userId: string) {
    const convs = await this.prisma.prisma().conversations.findMany({
      where: { participants: { some: { user_id: userId } } },
      include: {
        participants: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                profiles: { select: { display_name: true } },
              },
            },
          },
        },
        last_message: true,
      },
      orderBy: { updated_at: 'desc' },
    });
    return convs.map((c: any) => ({
      ...c,
      participants: c.participants.map((p: any) => ({
        conversation_id: p.conversation_id,
        user_id: p.user_id,
        last_read_at: p.last_read_at,
        user: p.users,
      })),
    }));
  }

  private async ensureParticipant(conversationId: string, userId: string) {
    const part = await this.prisma.prisma().conversation_participants.findUnique({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    });
    if (!part) throw new ForbiddenException('Not a participant');
    return part;
  }

  async listMessages(userId: string, conversationId: string, limit = 20, cursor?: string) {
    await this.ensureParticipant(conversationId, userId);

    let cursorFilter: any = {};
    if (cursor) {
      const c = this.decodeCursor(cursor);
      cursorFilter = {
        OR: [
          { created_at: { gt: c.created_at } },
          { AND: [{ created_at: c.created_at }, { id: { gt: c.id } }] },
        ],
      };
    }

    const results = await this.prisma.prisma().messages.findMany({
      where: { conversation_id: conversationId, ...cursorFilter },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const items = results.slice(0, limit);
    const nextCursor = results.length > limit ? this.encodeCursor(results[limit]) : null;
    return { items, nextCursor };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    if (!content.trim()) throw new BadRequestException('Empty message');
    await this.ensureParticipant(conversationId, userId);

    const msg = await this.prisma.prisma().messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: userId,
        content,
      },
    });

    await this.prisma.prisma().conversations.update({
      where: { id: conversationId },
      data: {
        last_message_id: msg.id,
        last_message_at: msg.created_at,
        updated_at: new Date(),
        messages_count: { increment: 1 },
      },
    });

    await this.prisma.prisma().conversation_participants.update({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
      data: { last_read_at: new Date() },
    });

    const recipients = await this.prisma.prisma().conversation_participants.findMany({
      where: { conversation_id: conversationId, user_id: { not: userId } },
    });

    for (const r of recipients) {
      const presence = await this.redis.get(`presence:${r.user_id}`);
      const online = presence === 'online';
      await this.notifications.emit({
        userId: r.user_id,
        type: NotificationType.new_message,
        actor_id: userId,
        subject_id: conversationId,
        payload: { content },
        sendEmail: !online,
      });
    }

    await this.pubsub.publish(`messageAdded:${conversationId}`, { messageAdded: msg });
    return msg;
  }

  async markRead(userId: string, conversationId: string) {
    await this.ensureParticipant(conversationId, userId);
    await this.prisma.prisma().conversation_participants.update({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
      data: { last_read_at: new Date() },
    });
    return true;
  }

  async isParticipant(conversationId: string, userId: string) {
    const count = await this.prisma.prisma().conversation_participants.count({
      where: { conversation_id: conversationId, user_id: userId },
    });
    return count > 0;
  }
}
