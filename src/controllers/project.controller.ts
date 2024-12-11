import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res)  => {
  try {
    const project = await prismaClient.project.create({ data: req.body });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getAll: RequestHandler = async (req, res)  => {
  try {
    const projects = await prismaClient.project.findMany();
    res.status(200).json(projects);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getOne: RequestHandler = async (req, res)  => {
  try {
    const project = await prismaClient.project.findUnique({ where: { id: parseInt(req.params.id) } });
    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const update: RequestHandler = async (req, res)  => {
  try {
    const project = await prismaClient.project.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const deleteProject: RequestHandler = async (req, res)  => {
  try {
    await prismaClient.project.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
