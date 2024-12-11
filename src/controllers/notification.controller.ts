import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res)  => {
  try {
    const notification = await prismaClient.notification.create({ data: req.body });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getByUser: RequestHandler = async (req, res)  => {
  try {
    const notifications = await prismaClient.notification.findMany(
      {
        where: { userId: parseInt(req.params.userId, 10) },
        orderBy: {
          emissionDate: 'asc',
        },
      }
    );
    res.status(200).json(notifications);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getOne: RequestHandler = async (req, res)  => {
  try {
    const notification = await prismaClient.notification.findUnique({ where: { id: parseInt(req.params.id) } });
    res.status(200).json(notification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const deleteNotification: RequestHandler = async (req, res)  => {
  try {
    await prismaClient.notification.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

