import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';

const prismaClient = new PrismaClient();

// Controller methods

export const create: RequestHandler = async (req, res) => {
  try {
    const application = await prismaClient.application.create({
      data: req.body,
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const applications = await prismaClient.application.findMany();
    res.status(200).json(applications);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOne: RequestHandler = async (req, res) => {
  try {
    const application = await prismaClient.application.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
    } else {
      res.status(200).json(application);
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const application = await prismaClient.application.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.status(200).json(application);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteApplication: RequestHandler = async (req, res) => {
  try {
    await prismaClient.application.delete({
      where: { id: parseInt(req.params.id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
