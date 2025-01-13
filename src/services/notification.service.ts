import { logger } from '../utils/logger';
import { Notification } from '../models/notification.model';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  async getAllNotifications(): Promise<Notification[]> {
    try {
      const notifications = await prisma.notification.findMany();
      if (!notifications.length) {
        return [];
      }
      return notifications.map((notification) => new Notification(
        notification.id,
        notification.userId,
        notification.seen,
        notification.description,
        notification.emissionDate,
        notification.emitterProjectId ? notification.emitterProjectId : undefined,
        notification.emitterUserId ? notification.emitterUserId : undefined,
        notification.link ? notification.link : undefined
      ));
    } catch (error) {
      logger(`Error in getAllNotifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getNotificationByParams(params: { id: number }): Promise<Notification | null> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: Number(params.id) },
      });
      if (!notification) {
        return null;
      }
      return new Notification(
        notification.id,
        notification.userId,
        notification.seen,
        notification.description,
        notification.emissionDate,
        notification.emitterProjectId ? notification.emitterProjectId : undefined,
        notification.emitterUserId ? notification.emitterUserId : undefined,
        notification.link ? notification.link : undefined
      );
    } catch (error) {
      logger(`Error in getNotificationByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createNotification(data: Omit<Notification, 'id'>): Promise<Notification | null> {
    try {
      const notification = await prisma.notification.create({
        data: {
          ...data,
        },
      });
      if (!notification) {
        return null;
      }
      return new Notification(
        notification.id,
        notification.userId,
        notification.seen,
        notification.description,
        notification.emissionDate,
        notification.emitterProjectId ? notification.emitterProjectId : undefined,
        notification.emitterUserId ? notification.emitterUserId : undefined,
        notification.link ? notification.link : undefined
      );
    } catch (error) {
      logger(`Error in createNotification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateNotificationByParams(
    params: { id: number },
    data: Partial<Notification>
  ): Promise<Notification | null> {
    try {
      const notification = await prisma.notification.update({
        where: { id: Number(params.id) },
        data: {
          ...data,
        },
      });
      if (!notification) {
        return null;
      }
      return new Notification(
        notification.id,
        notification.userId,
        notification.seen,
        notification.description,
        notification.emissionDate,
        notification.emitterProjectId ? notification.emitterProjectId : undefined,
        notification.emitterUserId ? notification.emitterUserId : undefined,
        notification.link ? notification.link : undefined
      );
    } catch (error) {
      logger(`Error in updateNotificationByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteAllNotifications(): Promise<boolean> {
    try {
      await prisma.notification.deleteMany();
      const notifications = await prisma.notification.findMany();
      return !notifications.length;
    } catch (error) {
      logger(`Error in deleteAllNotifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteNotificationByParams(params: { id: number }): Promise<boolean> {
    try {
      const notification = await prisma.notification.delete({
        where: { id: Number(params.id) },
      });
      const notificationExists = await prisma.notification.findUnique({
        where: { id: Number(params.id) },
      });
      if (notificationExists) {
        return false;
      }
      return !!notification;
    } catch (error) {
      logger(`Error in deleteNotificationByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}