import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res) => {
  try {
    const experience = await prismaClient.experience.create({
      data: req.body,
    });
    res.status(201).json(experience);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const experiences = await prismaClient.experience.findMany();
    res.status(200).json(experiences);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOne: RequestHandler = async (req, res) => {
  try {
    const experience = await prismaClient.experience.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!experience) {
      res.status(404).json({ error: 'Experience not found' });
    }
    res.status(200).json(experience);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const experience = await prismaClient.experience.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.status(200).json(experience);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteExperience: RequestHandler = async (req, res) => {
  try {
    await prismaClient.experience.delete({
      where: { id: parseInt(req.params.id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
