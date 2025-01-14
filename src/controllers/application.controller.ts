import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ApplicationService } from '../services/application.service';
import { Application } from '../models/application.model';

const applicationService = new ApplicationService();

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: API for managing applications
 */
export class ApplicationController {
  
  /**
   * @swagger
   * /applications:
   *   get:
   *     summary: Retrieve all applications
   *     tags: [Applications]
   *     responses:
   *       200:
   *         description: A list of applications
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Application'
   *       404:
   *         description: No applications found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const applications = await applicationService.getApplications();
      if (!applications.length) {
        res.status(404).json({ message: 'No applications found' });
        return;
      }
      res.status(200).json(applications);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  /**
   * @swagger
   * /applications/{id}:
   *   get:
   *     summary: Get application by ID
   *     tags: [Applications]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: Application details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Application'
   *       404:
   *         description: Application not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const application = await applicationService.getApplicationByParams(id);
      if (!application) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }
      res.status(200).json(application);
    } catch (error) {
      logger(`Error in getByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  /**
   * @swagger
   * /applications:
   *   post:
   *     summary: Create a new application
   *     tags: [Applications]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Application'
   *     responses:
   *       201:
   *         description: Application created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Application'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const applicationToCreate = new Application(
        0,
        req.body.description,
        req.body.userId,
        req.body.projectId,
      );
      const application = await applicationService.createApplication(applicationToCreate);
      if (!application) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(application);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  /**
   * @swagger
   * /applications/{id}:
   *   put:
   *     summary: Update an application
   *     tags: [Applications]
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
   *             $ref: '#/components/schemas/Application'
   *     responses:
   *       200:
   *         description: Application updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Application'
   *       404:
   *         description: Application not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const application = await applicationService.updateApplication(id, req.body);
      if (!application) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }
      res.status(200).json(application);
    } catch (error) {
      logger(`Error in update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  /**
   * @swagger
   * /applications/{id}:
   *   delete:
   *     summary: Delete an application
   *     tags: [Applications]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Application deleted
   *       404:
   *         description: Application not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const isDeleted = await applicationService.deleteApplication(id);
      if (!isDeleted) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger(`Error in delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  //delete all
  /**
   * @swagger
   * /applications:
   *   delete:
   *     summary: Delete all applications
   *     tags: [Applications]
   *     responses:
   *       204:
   *         description: Applications deleted
   *       404:
   *         description: No applications found
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const isDeleted = await applicationService.deleteAllApplications();
      if (!isDeleted) {
        res.status(404).json({ message: 'No applications found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}