import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res)  => {
  try {
    const message = await prismaClient.messages.create({ data: req.body });
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getByUser: RequestHandler = async (req, res) => {
  try {
    const messages = await prismaClient.messages.findMany({
      where: {
        OR: [
          { sender_user_id: parseInt(req.params.userId, 10) },
          { receiver_user_id: parseInt(req.params.userId, 10) },
        ],
      },
      orderBy: {
        sent_date: 'asc',
      },
    });

    if (!messages || messages.length === 0) {
      res.status(404).json({ error: 'No messages found for this user' });
    }    res.status(200).json(messages);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getByUsers: RequestHandler = async (req, res) => {
  try {
    const message = await prismaClient.messages.findMany({
      where: {
        sender_user_id: parseInt(req.params.senderUserId, 10),
        receiver_user_id: parseInt(req.params.receiverUserId, 10),
      }
    });
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteMessage: RequestHandler = async (req, res) => {
  try {
    await prismaClient.messages.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
