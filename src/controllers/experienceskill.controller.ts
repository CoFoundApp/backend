import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export const create: RequestHandler = async (req, res) => {
  try {
    const experienceSkill = await prismaClient.experienceSkill.create({ data: req.body });
    res.status(201).json(experienceSkill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll: RequestHandler = async (req, res) => {
  try {
    const experienceSkills = await prismaClient.experienceSkill.findMany();
    res.status(200).json(experienceSkills);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getSkill: RequestHandler = async (req, res) => {
  try {
    const experienceSkill = await prismaClient.experienceSkill.findMany({
      where: { experienceId: parseInt(req.params.id, 10) }
    });
    if (!experienceSkill) {
      res.status(404).json({ error: 'Experience skill not found' });
    }
    res.status(200).json(experienceSkill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getExperience: RequestHandler = async (req, res) => {
  try {
    const experienceSkill = await prismaClient.experienceSkill.findMany({
      where: { skillId: parseInt(req.params.id, 10) }
    });
    if (!experienceSkill) {
      res.status(404).json({ error: 'Experience skill not found' });
    }
    res.status(200).json(experienceSkill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};


export const deleteExperienceSkill: RequestHandler = async (req, res) => {
  try {
    await prismaClient.experienceSkill.delete({
      where: {
        skillId_experienceId: {
          experienceId: parseInt(req.params.experienceId, 10),
          skillId: parseInt(req.params.skillId, 10),
        }
      }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
