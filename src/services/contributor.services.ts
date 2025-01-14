import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { Contributor } from '../models/contributor.model';

const prisma = new PrismaClient();

export class ContributorService {
  async getAllContributorsByProjectId(params: { projectId: number }): Promise<Contributor[]> {
    try {
      const contributors = await prisma.contributor.findMany({
        where: { projectId: Number(params.projectId) },
      });
      if (!contributors.length) {
        return [];
      }
      return contributors.map((contributor) => new Contributor(
        contributor.id,
        contributor.endingDate ?? undefined,
        contributor.role,
        contributor.projectId,
        contributor.mission,
        contributor.userId,
        contributor.startingDate
      ));
    } catch (error) {
      logger(`Error in getAllContributorsByProjectId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getContributorByParams(params: { id: number }): Promise<Contributor | null> {
    try {
      const contributor = await prisma.contributor.findUnique({
        where: { id: Number(params.id) },
      });
      if (!contributor) {
        return null;
      }
      return new Contributor(
        contributor.id,
        contributor.endingDate ?? undefined,
        contributor.role,
        contributor.projectId,
        contributor.mission,
        contributor.userId,
        contributor.startingDate
      );
    } catch (error) {
      logger(`Error in getContributorByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createContributor(data: Omit<Contributor, 'id'>): Promise<Contributor | null> {
    try {
      const contributor = await prisma.contributor.create({
        data: {
          ...data,
        },
      });
      if (!contributor) {
        return null;
      }
      return new Contributor(
        contributor.id,
        contributor.endingDate ?? undefined,
        contributor.role,
        contributor.projectId,
        contributor.mission,
        contributor.userId,
        contributor.startingDate
      );
    } catch (error) {
      logger(`Error in createContributor: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateContributorByParams(params: { id: number }, data: Omit<Contributor, 'id'>): Promise<Contributor | null> {
    try {
      // Check if the contributor exists
      const existingContributor = await prisma.contributor.findUnique({
        where: { id: Number(params.id) },
      });

      if (!existingContributor) {
        logger(`Contributor with ID ${params.id} does not exist.`);
        return null;
      }

      // Proceed with the update
      const contributor = await prisma.contributor.update({
        where: { id: Number(params.id) },
        data: {
          ...data,
        },
      });

      return new Contributor(
        contributor.id,
        contributor.endingDate ?? undefined,
        contributor.role,
        contributor.projectId,
        contributor.mission,
        contributor.userId,
        contributor.startingDate
      );
    } catch (error) {
      logger(`Error in updateContributorByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteContributorByParams(params: { id: number }): Promise<boolean> {
    try {
      // Check if the contributor exists
      const existingContributor = await prisma.contributor.findUnique({
        where: { id: Number(params.id) },
      });

      if (!existingContributor) {
        logger(`Contributor with ID ${params.id} does not exist.`);
        return false;
      }

      // Proceed with the delete
      await prisma.contributor.delete({
        where: { id: Number(params.id) },
      });

      return true;
    } catch (error) {
      logger(`Error in deleteContributorByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteAllContributors(): Promise<boolean> {
    try {
      await prisma.contributor.deleteMany();
      return true;
    } catch (error) {
      logger(`Error in deleteAllContributors: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}