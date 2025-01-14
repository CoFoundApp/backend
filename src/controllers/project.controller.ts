// project controller
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ProjectService } from '../services/project.services';

const projectService = new ProjectService();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: API for managing projects
 */
export class ProjectController {
  /**
   * @swagger
   * /projects:
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
   * /projects/{id}:
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
   * /projects:
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
   * /projects/{id}:
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
   * /projects/{id}:
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
   * /projects:
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
}