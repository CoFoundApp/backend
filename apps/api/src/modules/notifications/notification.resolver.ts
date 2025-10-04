import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import {
  Notification,
  NotificationConnection,
  NotificationPreference,
} from './notification.type';
import { NotificationType, EmailFrequency } from '../../common/enums/domain.enums';
import { NotificationService } from './notification.service';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notifications: NotificationService) {}

  @UseGuards(SessionGuard)
  @Query(() => NotificationConnection, { description: 'List user notifications' })
  async notificationsQuery(
    @CurrentUser() user: JwtUser,
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('type', { type: () => NotificationType, nullable: true }) type?: NotificationType,
    @Args('unreadOnly', { type: () => Boolean, nullable: true }) unreadOnly?: boolean,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.list(user.sub, limit ?? 20, cursor ?? undefined, type, unreadOnly);
  }

  @UseGuards(SessionGuard)
  @Query(() => Number, { description: 'Unread notifications count' })
  async unreadCount(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.unreadCount(user.sub);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Mark a notification as read' })
  async markNotificationRead(
    @CurrentUser() user: JwtUser,
    @Args('id', { type: () => String }) id: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.markRead(user.sub, id);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Mark all notifications as read' })
  async markAllNotificationsRead(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.markAllRead(user.sub);
  }

  @UseGuards(SessionGuard)
  @Query(() => [NotificationPreference], { description: 'Get notification preferences' })
  async notificationPreferences(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.getPreferences(user.sub);
    }

  @UseGuards(SessionGuard)
  @Mutation(() => NotificationPreference, { description: 'Update notification preference' })
  async updateNotificationPreference(
    @CurrentUser() user: JwtUser,
    @Args('type', { type: () => NotificationType }) type: NotificationType,
    @Args('site_enabled', { type: () => Boolean, nullable: true }) site_enabled?: boolean,
    @Args('email_frequency', { type: () => EmailFrequency, nullable: true })
    email_frequency?: EmailFrequency,
    @Args('quiet_hours_start', { type: () => String, nullable: true })
    quiet_hours_start?: string,
    @Args('quiet_hours_end', { type: () => String, nullable: true })
    quiet_hours_end?: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.notifications.updatePreference(
      user.sub,
      type,
      site_enabled,
      email_frequency,
      quiet_hours_start ?? null,
      quiet_hours_end ?? null,
    );
  }
}
