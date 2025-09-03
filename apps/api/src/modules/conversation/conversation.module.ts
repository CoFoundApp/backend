import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ConversationService } from './conversation.service';
import { ConversationResolver } from './conversation.resolver';
import { NotificationModule } from '../notifications/notification.module';
import { RedisModule } from '../../infra/redis/redis.module';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from './conversation.constants';

@Module({
  imports: [PrismaModule, NotificationModule, RedisModule],
  providers: [
    ConversationService,
    ConversationResolver,
    { provide: PUB_SUB, useValue: new PubSub() },
  ],
})
export class ConversationModule {}
