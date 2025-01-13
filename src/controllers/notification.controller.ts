// notification controller
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notification.service';

const notificationService = new NotificationService();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API for managing notifications
 */
export class NotificationController {
  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Retrieve all notifications
   *     tags: [Notifications]
   *     responses:
   *       200:
   *         description: A list of notifications
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Notification'
   *       404:
   *         description: No notifications found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const notifications = await notificationService.getAllNotifications();
      if (!notifications.length) {
        res.status(404).json({ message: 'No notifications found' });
        return;
      }
      res.status(200).json(notifications);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /notifications/{id}:
   *   get:
   *     summary: Get notification by ID
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A notification
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Notification'
   *       404:
   *         description: Notification not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationService.getNotificationByParams({ id: Number(req.params.id) });
      if (!notification) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }
      res.status(200).json(notification);
    } catch (error) {
      logger(`Error in getById: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /notifications:
   *   post:
   *     summary: Create a notification
   *     tags: [Notifications]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Notification'
   *     responses:
   *       201:
   *         description: Notification created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Notification'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationService.createNotification(req.body);
      if (!notification) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(notification);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /notifications/{id}:
   *   put:
   *     summary: Update a notification by ID
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Notification'
   *     responses:
   *       200:
   *         description: Notification updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Notification'
   *       404:
   *         description: Notification not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationService.updateNotificationByParams({ id: Number(req.params.id) }, req.body);
      if (!notification) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }
      res.status(200).json(notification);
    } catch (error) {
      logger(`Error in update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /notifications/{id}:
   *   delete:
   *     summary: Delete a notification by ID
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Notification deleted
   *       404:
   *         description: Notification not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const isDeleted = await notificationService.deleteNotificationByParams({ id: Number(req.params.id) });
      if (!isDeleted) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }
      res.sendStatus(204);
    } catch (error) {
      logger(`Error in delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /notifications:
   *   delete:
   *     summary: Delete all notifications
   *     tags: [Notifications]
   *     responses:
   *       204:
   *         description: Notifications deleted
   *       404:
   *         description: No notifications found
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const isDeleted = await notificationService.deleteAllNotifications();
      if (!isDeleted) {
        res.status(404).json({ message: 'No notifications found' });
        return;
      }
      res.sendStatus(204);
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}