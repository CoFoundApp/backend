import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res) => {
  try {
    const user = await prismaClient.user.create({ data: req.body });
    res.status(201).json(user); // Don't return the response
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const users = await prismaClient.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOne: RequestHandler = async (req, res) => {
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json(user);
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const user = await prismaClient.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  try {
    await prismaClient.user.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
