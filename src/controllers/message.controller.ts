import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { MessageService } from '../services/message.service';

const messageService = new MessageService();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: API for managing messages
 */
export class MessageController {
  // swagger doc with example
  /**
   * @swagger
   * /api/messages:
   *   post:
   *     summary: Create a new message
   *     tags: [Messages]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Message'
   *           example:
   *             receiverUserId: 1
   *             sentDate: 2021-10-15T10:00:00.000Z
   *             message: Hello
   *             senderUserId: 2
   *             seenDate: 2021-10-15T10:00:00.000Z
   *     responses:
   *       201:
   *         description: Message created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Message'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const messageToCreate = req.body;
      const message = await messageService.createMessage(messageToCreate);
      if (!message) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(message);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/messages/{receiverUserId}/{senderUserId}:
   *   get:
   *     summary: Get messages between two users
   *     tags: [Messages]
   *     parameters:
   *       - in: path
   *         name: receiverUserId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: senderUserId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Messages found
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Message'
   *       500:
   *         description: Internal Server Error
   */
  async getMessagesByUsers(req: Request, res: Response): Promise<void> {
    try {
      const receiverUserId = Number(req.params.receiverUserId);
      const senderUserId = Number(req.params.senderUserId);
      const messages = await messageService.getMessagesByUsers(receiverUserId, senderUserId);
      res.status(200).json(messages);
    } catch (error) {
      logger(`Error in getMessagesByUsers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/messages/conversations/{userId}:
   *   get:
   *     summary: Get conversations by user for chat preview and lightweight conversations
   *     tags: [Messages]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Conversations found
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Conversation'
   *       500:
   *         description: Internal Server Error
   */
  async getConversationsByUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.receiverUserId);
      const conversations = await messageService.getConversationsByUser(userId);
      res.status(200).json(conversations);
    } catch (error) {
      logger(`Error in getConversationsByUser: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/messages/seen/{messageId}:
   *   put:
   *     summary: Update message seen status
   *     tags: [Messages]
   *     parameters:
   *       - in: path
   *         name: messageId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Message updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Message'
   *       500:
   *         description: Internal Server Error
   */
  async updateMessageSeen(req: Request, res: Response): Promise<void> {
    try {
      const messageId = Number(req.params.messageId);
      const message = await messageService.updateMessageSeen(messageId);
      if (!message) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(200).json(message);
    } catch (error) {
      logger(`Error in updateMessageSeen: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}