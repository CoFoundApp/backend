import { Project, ProjectWithTopics } from '../models/project.model';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectService {

  async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await prisma.project.findMany();
      if (!projects.length) {
        return [];
      }
      return projects.map((project) => new Project(
        project.id,
        project.userId,
        project.startingDate,
        project.description,
        project.title,
        project.endingDate ?? undefined
      ));
    } catch (error) {
      logger(`Error in getAllProjects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getProjectByParams(params: { id: number }): Promise<Project | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: Number(params.id) },
      });
      if (!project) {
        return null;
      }
      return new Project(
        project.id,
        project.userId,
        project.startingDate,
        project.description,
        project.title,
        project.endingDate ?? undefined
      );
    } catch (error) {
      logger(`Error in getProjectByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createProjectByParams(data: Omit<Project, 'id'>): Promise<Project | null> {
    try {
      const project = await prisma.project.create({
        data: {
          ...data,
        },
      });
      if (!project) {
        return null;
      }
      return new Project(
        project.id,
        project.userId,
        project.startingDate,
        project.description,
        project.title,
        project.endingDate ?? undefined
      );
    } catch (error) {
      logger(`Error in createProject: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateProjectByParams(params: { id: number }, data: Omit<Project, 'id'>): Promise<Project | null> {
    try {
      const project = await prisma.project.update({
        where: { id: Number(params.id) },
        data: {
          ...data,
        },
      });
      if (!project) {
        return null;
      }
      return new Project(
        project.id,
        project.userId,
        project.startingDate,
        project.description,
        project.title,
        project.endingDate ?? undefined
      );
    } catch (error) {
      logger(`Error in updateProject: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteProjectByParams(params: { id: number }): Promise<boolean> {
    try {
      await prisma.project.delete({
        where: { id: Number(params.id) },
      });
      const project = await prisma.project.findUnique({
        where: { id: Number(params.id) },
      });

      return !project;
    } catch (error) {
      logger(`Error in deleteProject: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteAllProjects(): Promise<boolean> {
    try {
      await prisma.project.deleteMany();
      const projects = await prisma.project.findMany();
      return !projects.length;

    } catch (error) {
      logger(`Error in deleteAllProjects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async getProjectWithTopicsByProjectId(projectId: number): Promise<ProjectWithTopics | null> {
    try {
      const projects = await prisma.topicProject.findMany({
        where: {
          projectId: projectId,
        },
      });
      if (!projects.length) {
        return null;
      }
      return new ProjectWithTopics(projects[0].projectId, projects.map((project) => project.topicId));
    } catch (error) {
      logger(`Error in getProjectWithTopicsByProjectId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}