import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { Application } from '../models/application.model';

const prisma = new PrismaClient();

export class ApplicationService {
  
  async createApplication(application: Application): Promise<Application | null>{
    try {
      const applicationCreated = await prisma.application.create({
        data: {
          isRefused: application.isRefused,
          isAccepted: application.isAccepted,
          description: application.description,
          userId: application.userId,
          projectId: application.projectId,
        }
      });
      if (!applicationCreated) {
        return null;
      }
      return applicationCreated;
    } catch (error) {
      logger(`Error in createApplication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getApplications(): Promise<Application[]> {
    try {
      const applications = await prisma.application.findMany();
      if (!applications.length) {
        return [];
      }
      return applications.map((application) => new Application(
        application.id,
        application.description,
        application.userId,
        application.projectId
      ));
    } catch (error) {
      logger(`Error in getApplications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getApplicationByParams(id: number): Promise<Application | null> {
    try {
      const application = await prisma.application.findUnique({
        where: {
          id: id
        }
      });
      if (!application) {
        return null;
      }
      return new Application(
        application.id,
        application.description,
        application.userId,
        application.projectId,
        application.isRefused,
        application.isAccepted
      );
    } catch (error) {
      logger(`Error in getApplicationByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async updateApplication(id: number, application: Application): Promise<Application | null> {
    try {
      const applicationToUpdate = await prisma.application.findUnique({
        where: {
          id: id
        }
      });
      if (!applicationToUpdate) {
        return null;
      }
      const applicationUpdated = await prisma.application.update({
        where: {
          id: id
        },
        data: {
          isRefused: application.isRefused,
          isAccepted: application.isAccepted,
          description: application.description,
          userId: application.userId,
          projectId: application.projectId,
        }
      });
      if (!applicationUpdated) {
        return null;
      }
      return applicationUpdated;
    } catch (error) {
      logger(`Error in updateApplication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async deleteApplication(id: number): Promise<boolean> {
    try {
      const applicationToDelete = await prisma.application.findUnique({
        where: {
          id: id
        }
      });
      if (!applicationToDelete) {
        return false;
      }
      await prisma.application.delete({
        where: {
          id: id
        }
      });
      const applicationDeleted = await prisma.application.findUnique({
        where: {
          id: id
        }
      });
      return !applicationDeleted;
      
    } catch (error) {
      logger(`Error in deleteApplication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
  
  async deleteAllApplications(): Promise<boolean> {
    try {
      await prisma.application.deleteMany();
      const applications = await prisma.application.findMany();
      return !applications.length;
    } catch (error) {
      logger(`Error in deleteAllApplications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
  
}