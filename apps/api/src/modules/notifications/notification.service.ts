import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationType, EmailFrequency } from '../../common/enums/domain.enums';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { AppError } from '../../common/errors/app-error.factory';


@Injectable()
export class NotificationService {
  private toPrismaType(type: NotificationType): $Enums.notification_type {
    return type as unknown as $Enums.notification_type;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: TemplateMailerService,
  ) {}

  private encodeCursor(n: { created_at: Date; id: string }) {
    return Buffer.from(`${n.created_at.toISOString()}::${n.id}`).toString('base64');
  }

  private decodeCursor(cursor: string) {
    const [date, id] = Buffer.from(cursor, 'base64').toString().split('::');
    return { created_at: new Date(date), id };
  }

  async list(
    userId: string,
    limit = 20,
    cursor?: string,
    type?: NotificationType,
    unreadOnly?: boolean,
  ) {
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

    const results = await this.prisma
      .prisma()
      .notifications.findMany({
        where: {
          user_id: userId,
          type: type ? this.toPrismaType(type) : undefined,
          is_read: unreadOnly ? false : undefined,
          ...cursorFilter,
        },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      });

    const items = results.slice(0, limit);
    const next = results.length > limit ? this.encodeCursor(results[limit]) : null;
    return { items, nextCursor: next };
  }

  async unreadCount(userId: string) {
    return this.prisma.prisma().notifications.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.prisma().notifications.findUnique({
      where: { id },
    });
    if (!notif) throw AppError.notFound('notification.not.found');
    if (notif.user_id !== userId) throw AppError.forbidden('not.owner');
    await this.prisma.prisma().notifications.update({
      where: { id },
      data: { is_read: true, updated_at: new Date() },
    });
    return true;
  }

  async markAllRead(userId: string) {
    await this.prisma.prisma().notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, updated_at: new Date() },
    });
    return true;
  }

  async getPreferences(userId: string) {
    return this.prisma.prisma().notification_preferences.findMany({
      where: { user_id: userId },
    });
  }

  private parseTime(value?: string | null) {
    return value ? new Date(`1970-01-01T${value}Z`) : null;
  }

  private resolveLocale(locale?: string | null): 'fr' | 'en' {
    if (!locale) return 'en';
    const normalized = locale.toLowerCase();
    if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr';
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
    return 'en';
  }

  async updatePreference(
    userId: string,
    type: NotificationType,
    site_enabled?: boolean,
    email_frequency?: EmailFrequency,
    quiet_hours_start?: string | null,
    quiet_hours_end?: string | null,
  ) {
    const data: any = {
      ...(site_enabled !== undefined ? { site_enabled } : {}),
      ...(email_frequency ? { email_frequency } : {}),
      quiet_hours_start: this.parseTime(quiet_hours_start ?? null),
      quiet_hours_end: this.parseTime(quiet_hours_end ?? null),
      updated_at: new Date(),
    };
    return this.prisma.prisma().notification_preferences.upsert({
      where: {
        user_id_type: { user_id: userId, type: this.toPrismaType(type) },
      },
      update: data,
      create: {
        user_id: userId,
        type: this.toPrismaType(type),
        site_enabled: site_enabled ?? true,
        email_frequency: email_frequency ?? EmailFrequency.immediate,
        quiet_hours_start: this.parseTime(quiet_hours_start ?? null),
        quiet_hours_end: this.parseTime(quiet_hours_end ?? null),
      },
    });
  }

  private async getPreference(userId: string, type: NotificationType) {
    const pref = await this.prisma.prisma().notification_preferences.findUnique({
      where: {
        user_id_type: { user_id: userId, type: this.toPrismaType(type) },
      },
    });
    return {
      site_enabled: pref?.site_enabled ?? true,
      email_frequency: pref?.email_frequency ?? EmailFrequency.immediate,
      quiet_hours_start: pref?.quiet_hours_start,
      quiet_hours_end: pref?.quiet_hours_end,
    };
  }

  private inQuietHours(start?: Date | null, end?: Date | null) {
    if (!start || !end) return false;
    const now = new Date();
    const nowTime = now.getUTCHours() * 60 + now.getUTCMinutes();
    const s = start.getUTCHours() * 60 + start.getUTCMinutes();
    const e = end.getUTCHours() * 60 + end.getUTCMinutes();
    if (s === e) return false;
    if (s < e) {
      return nowTime >= s && nowTime < e;
    }
    return nowTime >= s || nowTime < e;
  }

  async emit(args: {
    userId: string;
    type: NotificationType;
    subject_id?: string | null;
    actor_id?: string | null;
    project_id?: string | null;
    payload?: Record<string, any>;
    digest_key?: string | null;
    idempotency_key?: string | null;
    sendEmail?: boolean;
  }) {
    const pref = await this.getPreference(args.userId, args.type);
    const channels: string[] = [];
    if (pref.site_enabled) channels.push('site');
    if (pref.email_frequency !== EmailFrequency.off && args.sendEmail !== false) channels.push('email');
    if (!channels.length) return null;

    const notif = await this.prisma.prisma().notifications.create({
      data: {
        user_id: args.userId,
        type: this.toPrismaType(args.type),
        subject_id: args.subject_id ?? null,
        actor_id: args.actor_id ?? null,
        project_id: args.project_id ?? null,
        payload: args.payload ?? {},
        channels,
        digest_key: args.digest_key ?? null,
        idempotency_key: args.idempotency_key ?? null,
      },
    });

    if (channels.includes('email') && args.sendEmail !== false) {
      if (
        pref.email_frequency === EmailFrequency.immediate &&
        !this.inQuietHours(pref.quiet_hours_start, pref.quiet_hours_end)
      ) {
        await this.sendImmediateEmail(notif);
      }
    }

    return notif;
  }


  private async sendImmediateEmail(notif: any) {
    const user = await this.prisma.prisma().users.findUnique({
      where: { id: notif.user_id },
      select: { email: true, locale: true },
    });
    if (!user) return;

    const locale = this.resolveLocale(user.locale);
    await this.mailer.sendTemplate(
      user.email,
      notif.type,
      locale,
      notif.payload || {},
    );
    await this.prisma.prisma().notifications.update({
      where: { id: notif.id },
      data: { emailed_at: new Date() },
    });
  }

  @Cron('0 8 * * *')
  async runDailyDigest() {
    const digestDailyUsers = await this.prisma.prisma().notification_preferences.findMany({
      where: { email_frequency: EmailFrequency.digest_daily },
      select: { user_id: true },
    });

    const quietImmediatePrefs = await this.prisma.prisma().notification_preferences.findMany({
      where: {
        email_frequency: EmailFrequency.immediate,
        quiet_hours_start: { not: null },
        quiet_hours_end: { not: null },
      },
      select: { user_id: true, quiet_hours_start: true, quiet_hours_end: true },
    });

    const targetUserIds = new Set<string>(digestDailyUsers.map((p) => p.user_id));
    for (const pref of quietImmediatePrefs) {
      if (this.inQuietHours(pref.quiet_hours_start, pref.quiet_hours_end)) {
        targetUserIds.add(pref.user_id);
      }
    }

    if (!targetUserIds.size) return;

    const notifs = await this.prisma.prisma().notifications.findMany({
      where: {
        emailed_at: null,
        user_id: { in: Array.from(targetUserIds) },
      },
    });

    const byUser: Record<string, any[]> = {};
    for (const n of notifs) {
      const pref = await this.getPreference(n.user_id, n.type as NotificationType);
      if (
        pref.email_frequency === EmailFrequency.digest_daily ||
        (pref.email_frequency === EmailFrequency.immediate &&
          this.inQuietHours(pref.quiet_hours_start, pref.quiet_hours_end))
      ) {
        if (!byUser[n.user_id]) byUser[n.user_id] = [];
        byUser[n.user_id].push(n);
      }
    }

    for (const userId of Object.keys(byUser)) {
      const user = await this.prisma
        .prisma()
        .users.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
      if (!user) continue;
      const list = byUser[userId];
      const locale = this.resolveLocale(user.locale);
      await this.mailer.sendTemplate(user.email, 'digest', locale, {
        count: list.length,
        notifications: list,
      });
      await this.prisma.prisma().notifications.updateMany({
        where: { id: { in: list.map((n) => n.id) } },
        data: { emailed_at: new Date() },
      });
    }
  }

  @Cron('0 8 * * 1')
  async runWeeklyDigest() {
    const weeklyUsers = await this.prisma.prisma().notification_preferences.findMany({
      where: { email_frequency: EmailFrequency.digest_weekly },
      select: { user_id: true },
    });

    if (!weeklyUsers.length) return;

    const notifs = await this.prisma.prisma().notifications.findMany({
      where: {
        emailed_at: null,
        user_id: { in: weeklyUsers.map((u) => u.user_id) },
      },
    });
    const byUser: Record<string, any[]> = {};
    for (const n of notifs) {
      const pref = await this.getPreference(n.user_id, n.type as NotificationType);
      if (pref.email_frequency === EmailFrequency.digest_weekly) {
        if (!byUser[n.user_id]) byUser[n.user_id] = [];
        byUser[n.user_id].push(n);
      }
    }
    for (const userId of Object.keys(byUser)) {
      const user = await this.prisma
        .prisma()
        .users.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
      if (!user) continue;
      const list = byUser[userId];
      const locale = this.resolveLocale(user.locale);
      await this.mailer.sendTemplate(user.email, 'digest', locale, {
        count: list.length,
        notifications: list,
      });
      await this.prisma.prisma().notifications.updateMany({
        where: { id: { in: list.map((n) => n.id) } },
        data: { emailed_at: new Date() },
      });
    }
  }
}
