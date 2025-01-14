// experience.service.ts
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { Experience } from '../models/experience.model';

const prisma = new PrismaClient();

export class ExperienceService {
  async getAllExperiences(): Promise<Experience[]> {
    try {
      const experiences = await prisma.experience.findMany();
      if (!experiences.length) {
        return [];
      }
      return experiences.map((experience) => new Experience(
        experience.id,
        experience.userId,
        experience.description,
        experience.endingDate ?? undefined,
        experience.startingDate,
        experience.title,
        experience.location,
        experience.role
      ));
    } catch (error) {
      logger(`Error in getAllExperiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getExperienceByParams(params: { id: number }): Promise<Experience | null> {
    try {
      const experience = await prisma.experience.findUnique({
        where: { id: Number(params.id) },
      });
      if (!experience) {
        return null;
      }
      return new Experience(
        experience.id,
        experience.userId,
        experience.description,
        experience.endingDate ?? undefined,
        experience.startingDate,
        experience.title,
        experience.location,
        experience.role
      );
    } catch (error) {
      logger(`Error in getExperienceByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createExperienceByParams(data: Omit<Experience, 'id'>): Promise<Experience | null> {
    try {
      const experience = await prisma.experience.create({
        data: {
          ...data,
        },
      });
      if (!experience) {
        return null;
      }
      return new Experience(
        experience.id,
        experience.userId,
        experience.description,
        experience.endingDate ?? undefined,
        experience.startingDate,
        experience.title,
        experience.location,
        experience.role
      );
    } catch (error) {
      logger(`Error in createExperienceByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateExperienceByParams(params: { id: number }, data: Omit<Experience, 'id'>): Promise<Experience | null> {
    try {
      const experienceToUpdate = prisma.experience.findUnique({
        where: { id: Number(params.id) },
      });
      if (!experienceToUpdate) {
        return null;
      }
      const experience = await prisma.experience.update({
        where: { id: Number(params.id) },
        data: {
          ...data,
        },
      });
      if (!experience) {
        return null;
      }
      return new Experience(
        experience.id,
        experience.userId,
        experience.description,
        experience.endingDate ?? undefined,
        experience.startingDate,
        experience.title,
        experience.location,
        experience.role
      );
    } catch (error) {
      logger(`Error in updateExperienceByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteExperienceByParams(params: { id: number }): Promise<boolean> {
    try {
      const experienceToDelete = prisma.experience.findUnique({
        where: { id: Number(params.id) },
      });
      if (!experienceToDelete) {
        return false;
      }
      await prisma.experience.delete({
        where: { id: Number(params.id) },
      });
      const deletedExperience = await prisma.experience.findUnique({
        where: { id: Number(params.id) },
      });
      return !deletedExperience;

    } catch (error) {
      logger(`Error in deleteExperienceByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteAllExperiences(): Promise<boolean> {
    try {
      await prisma.experience.deleteMany();
      const experiences = await prisma.experience.findMany();
      return !experiences.length;

    } catch (error) {
      logger(`Error in deleteAllExperiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}