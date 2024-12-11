import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res) => {
  try {
    const favorites = await prismaClient.favorites.create({
      data: req.body,
    });
    res.status(201).json(favorites);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const favorites = await prismaClient.favorites.findMany();
    res.status(200).json(favorites);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getByUser: RequestHandler = async (req, res) => {
  try {
    const favorites = await prismaClient.favorites.findMany({
      where: { userId: parseInt(req.params.userId, 10) },
    });
    if (!favorites) {
      res.status(404).json({ error: 'Favorites not found' });
    }
    res.status(200).json(favorites);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteFavorite: RequestHandler = async (req, res) => {
  try {
    await prismaClient.favorites.delete({
      where: {
        projectId_userId: {
          projectId: parseInt(req.params.projectId, 10),
          userId: parseInt(req.params.userId, 10),
        }
      }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
