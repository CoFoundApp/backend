import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { SkillService } from '../services/skill.service';

const skillService = new SkillService();

/**
 * @swagger
 * tags:
 *   name: Skills
 *   description: API for managing skills
 */
export class SkillController {
  /**
   * @swagger
   * /api/skills:
   *   get:
   *     summary: Retrieve all skills
   *     tags: [Skills]
   *     responses:
   *       200:
   *         description: A list of skills
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Skill'
   *       404:
   *         description: No skills found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const skills = await skillService.getAllSkills();
      if (!skills.length) {
        res.status(404).json({ message: 'No skills found' });
        return;
      }
      res.status(200).json(skills);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/skills/{id}:
   *   get:
   *     summary: Get skill by ID
   *     tags: [Skills]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A skill object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Skill'
   *       404:
   *         description: Skill not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const skill = await skillService.getSkillByParams({ id: Number(req.params.id) });
      if (!skill) {
        res.status(404).json({ message: 'Skill not found' });
        return;
      }
      res.status(200).json(skill);
    } catch (error) {
      logger(`Error in getById: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/skills:
   *   post:
   *     summary: Create a new skill
   *     tags: [Skills]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Skill'
   *     responses:
   *       201:
   *         description: Skill created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Skill'
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const skill = await skillService.createSkill(req.body);
      if (!skill) {
        res.status(500).json({ message: 'Internal Server Error' });
        return;
      }
      res.status(201).json(skill);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/skills/{id}:
   *   put:
   *     summary: Update a skill by ID
   *     tags: [Skills]
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
   *             $ref: '#/components/schemas/Skill'
   *     responses:
   *       200:
   *         description: Skill updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Skill'
   *       404:
   *         description: Skill not found
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const skill = await skillService.updateSkill({ id: Number(req.params.id) }, req.body);
      if (!skill) {
        res.status(404).json({ message: 'Skill not found' });
        return;
      }
      res.status(200).json(skill);
    } catch (error) {
      logger(`Error in update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/skills/{id}:
   *   delete:
   *     summary: Delete a skill by ID
   *     tags: [Skills]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       204:
   *         description: Skill deleted
   *       404:
   *         description: Skill not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await skillService.deleteSkillByParams({ id: Number(req.params.id) });
      if (!deleted) {
        res.status(404).json({ message: 'Skill not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger(`Error in delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/skills:
   *   delete:
   *     summary: Delete all skills
   *     tags: [Skills]
   *     responses:
   *       204:
   *         description: Skills deleted
   *       404:
   *         description: No skills found
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await skillService.deleteAllSkills();
      if (!deleted) {
        res.status(404).json({ message: 'No skills found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}