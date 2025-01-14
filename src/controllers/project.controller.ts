// project controller
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ProjectService } from '../services/project.services';
import { FavoriteService } from '../services/favorite.service';

const projectService = new ProjectService();
const favoriteService = new FavoriteService();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: API for managing projects
 */
export class ProjectController {
  /**
   * @swagger
   * /api/projects:
   *   get:
   *     summary: Retrieve all projects
   *     tags: [Projects]
   *     responses:
   *       200:
   *         description: A list of projects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   *       404:
   *         description: No projects found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectService.getAllProjects();
      if (!projects.length) {
        res.status(404).json({ message: 'No projects found' });
        return;
      }
      res.status(200).json(projects);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   get:
   *     summary: Get project by ID
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A project
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         description: Project not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.getProjectByParams({ id: Number(req.params.id) });
      if (!project) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }
      res.status(200).json(project);
    } catch (error) {
      logger(`Error in getById: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Project'
   *     responses:
   *       201:
   *         description: Project created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.createProjectByParams(req.body);
      if (!project) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(project);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   put:
   *     summary: Update a project by ID
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Project'
   *     responses:
   *       200:
   *         description: Project updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         description: Project not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.updateProjectByParams({ id: Number(req.params.id) }, req.body);
      if (!project) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }
      res.status(200).json(project);
    } catch (error) {
      logger(`Error in update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   delete:
   *     summary: Delete a project by ID
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Project deleted
   *       404:
   *         description: Project not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const isDeleted = await projectService.deleteProjectByParams({ id: Number(req.params.id) });
      if (!isDeleted) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }
      res.sendStatus(204);
    } catch (error) {
      logger(`Error in delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects:
   *   delete:
   *     summary: Delete all projects
   *     tags: [Projects]
   *     responses:
   *       200:
   *         description: Projects deleted
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedProjects = await projectService.deleteAllProjects();
      if (!deletedProjects) {
        res.status(404).json({ message: 'No projects found' });
        return;
      }
      res.status(200).json({ message: 'Projects deleted' });
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{projectId}/favorites:
   *   get:
   *     summary: Retrieve all favorites by project id
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: projectId
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A list of favorites
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/FavoriteByProject'
   *       404:
   *         description: No favorites found
   *       500:
   *         description: Internal Server Error
   */
  async getAllFavoritesByProjectId(req: Request, res: Response): Promise<void> {
    try {
      const projectId = parseInt(req.params.projectId);
      const favorites = await favoriteService.getFavoritesByProjectId(projectId);
      if (!favorites) {
        res.status(404).json({ message: 'No favorites found' });
        return;
      }
      res.status(200).json(favorites);
    } catch (error) {
      logger(`Error in getAllFavoritesByProject: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{projectId}/favorites:
   *   delete:
   *     summary: Delete a favorite by project id
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: projectId
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: Favorite deleted
   *       404:
   *         description: Favorite not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteFavoriteByProjectId(req: Request, res: Response): Promise<void> {
    try {
      const projectId = parseInt(req.params.projectId);
      const favorite = await favoriteService.deleteAllFavoritesByProjectId(projectId);
      if (!favorite) {
        res.status(404).json({ message: 'Favorite not found' });
        return;
      }
      res.status(200).json({ message: 'Favorite deleted' });
    } catch (error) {
      logger(`Error in deleteFavoriteByProject: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}