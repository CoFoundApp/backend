import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ExperienceService } from '../services/experience.service';

const experienceService = new ExperienceService();

/**
 * @swagger
 * tags:
 *   name: Experiences
 *   description: API for managing experiences
 */
export class ExperienceController {
  /**
   * @swagger
   * /api/experiences:
   *   get:
   *     summary: Retrieve all experiences
   *     tags: [Experiences]
   *     responses:
   *       200:
   *         description: A list of experiences
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Experience'
   *       404:
   *         description: No experiences found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const experiences = await experienceService.getAllExperiences();
      if (!experiences.length) {
        res.status(404).json({ message: 'No experiences found' });
        return;
      }
      res.status(200).json(experiences);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/experiences/{id}:
   *   get:
   *     summary: Get experience by ID
   *     tags: [Experiences]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A single experience
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Experience'
   *       404:
   *         description: No experience found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const experience = await experienceService.getExperienceByParams({ id: Number(req.params.id) });
      if (!experience) {
        res.status(404).json({ message: 'No experience found' });
        return;
      }
      res.status(200).json(experience);
    } catch (error) {
      logger(`Error in getById: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/experiences:
   *   post:
   *     summary: Create a new experience
   *     tags: [Experiences]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Experience'
   *     responses:
   *       201:
   *         description: Experience created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Experience'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const experience = await experienceService.createExperienceByParams(req.body);
      if (!experience) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(experience);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/experiences/{id}:
   *   put:
   *     summary: Update experience by ID
   *     tags: [Experiences]
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
   *             $ref: '#/components/schemas/Experience'
   *     responses:
   *       200:
   *         description: Experience updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Experience'
   *       404:
   *         description: Experience not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const experience = await experienceService.updateExperienceByParams({ id: Number(req.params.id) }, req.body);
      if (!experience) {
        res.status(404).json({ message: 'Experience not found' });
        return;
      }
      res.status(200).json(experience);
    } catch (error) {
      logger(`Error in update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/experiences/{id}:
   *   delete:
   *     summary: Delete experience by ID
   *     tags: [Experiences]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Experience deleted
   *       404:
   *         description: Experience not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await experienceService.deleteExperienceByParams({ id: Number(req.params.id) });
      if (!deleted) {
        res.status(404).json({ message: 'Experience not found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      logger(`Error in delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/experiences:
   *   delete:
   *     summary: Delete all experiences
   *     tags: [Experiences]
   *     responses:
   *       200:
   *         description: Experiences deleted
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedExperiences = await experienceService.deleteAllExperiences();
      if (!deletedExperiences) {
        res.status(404).json({ message: 'No experiences found' });
        return;
      }
      res.status(200).json({ message: 'Experiences deleted' });
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
