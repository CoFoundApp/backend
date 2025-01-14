import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ContributorService } from '../services/contributor.services';

const contributorService = new ContributorService();

/**
 * @swagger
 * tags:
 *   name: Contributors
 *   description: API for managing contributors
 */
export class ContributorController {

  /**
   * @swagger
   * /projects/{projectId}/contributors:
   *   get:
   *     summary: Retrieve all contributors by project ID
   *     tags: [Contributors]
   *     parameters:
   *       - in: path
   *         name: projectId
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A list of contributors
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Contributor'
   *       404:
   *         description: No contributors found
   *       500:
   *         description: Internal Server Error
   */
  async getAllByProjectId(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.params.projectId);
      const contributors = await contributorService.getAllContributorsByProjectId({ projectId });
      if (!contributors.length) {
        res.status(404).json({ message: 'No contributors found' });
        return;
      }
      res.status(200).json(contributors);
    } catch (error) {
      logger(`Error in getAllByProjectId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /contributors/{id}:
   *   get:
   *     summary: Get contributor by ID
   *     tags: [Contributors]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A contributor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Contributor'
   *       404:
   *         description: Contributor not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const contributor = await contributorService.getContributorByParams({ id: Number(req.params.id) });
      if (!contributor) {
        res.status(404).json({ message: 'Contributor not found' });
        return;
      }
      res.status(200).json(contributor);
    } catch (error) {
      logger(`Error in getByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /contributors:
   *   post:
   *     summary: Create a new contributor
   *     tags: [Contributors]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Contributor'
   *     responses:
   *       201:
   *         description: Contributor created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Contributor'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const contributor = await contributorService.createContributor(req.body);
      if (!contributor) {
        res.status(500).json({ message: 'Error creating contributor' });
        return;
      }
      res.status(201).json(contributor);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /contributors/{id}:
   *   put:
   *     summary: Update a contributor by ID
   *     tags: [Contributors]
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
   *             $ref: '#/components/schemas/Contributor'
   *     responses:
   *       200:
   *         description: Contributor updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Contributor'
   *       404:
   *         description: Contributor not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const contributor = await contributorService.updateContributorByParams({ id: Number(req.params.id) }, req.body);
      if (!contributor) {
        res.status(404).json({ message: 'Contributor not found' });
        return;
      }
      res.status(200).json(contributor);
    } catch (error) {
      logger(`Error in updateByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /contributors/{id}:
   *   delete:
   *     summary: Delete a contributor by ID
   *     tags: [Contributors]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Contributor deleted
   *       404:
   *         description: Contributor not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await contributorService.deleteContributorByParams({ id: Number(req.params.id) });
      if (!deleted) {
        res.status(404).json({ message: 'Contributor not found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      logger(`Error in deleteByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /contributors:
   *   delete:
   *     summary: Delete all contributors
   *     tags: [Contributors]
   *     responses:
   *       204:
   *         description: Contributors deleted
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await contributorService.deleteAllContributors();
      if (!deleted) {
        res.status(404).json({ message: 'No contributors found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}