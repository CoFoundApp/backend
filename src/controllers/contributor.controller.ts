import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res) => {
  try {
    const contributor = await prismaClient.contributor.create({
      data: req.body,
    });
    res.status(201).json(contributor);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const contributors = await prismaClient.contributor.findMany();
    res.status(200).json(contributors);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOne: RequestHandler = async (req, res) => {
  try {
    const contributor = await prismaClient.contributor.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
    } else {
      res.status(200).json(contributor);
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const contributor = await prismaClient.contributor.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.status(200).json(contributor);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteContributor: RequestHandler = async (req, res) => {
  try {
    await prismaClient.contributor.delete({
      where: { id: parseInt(req.params.id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
