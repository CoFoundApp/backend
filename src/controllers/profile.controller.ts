import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res)  => {
  try {
    const profile = await prismaClient.profil.create({ data: req.body });
    res.status(201).json(profile);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getAll: RequestHandler = async (req, res)  => {
  try {
    const profiles = await prismaClient.profil.findMany();
    res.status(200).json(profiles);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const getOne: RequestHandler = async (req, res)  => {
  try {
    const profile = await prismaClient.profil.findUnique({ where: { id: parseInt(req.params.id) } });
    res.status(200).json(profile);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const update: RequestHandler = async (req, res)  => {
  try {
    const profile = await prismaClient.profil.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.status(200).json(profile);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export const deleteProfile: RequestHandler = async (req, res)  => {
  try {
    await prismaClient.profil.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

