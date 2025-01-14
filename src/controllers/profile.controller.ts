// profile controller
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ProfileService } from '../services/profile.service';
import { validateProfile } from '../validators/profile.validator';

const profileService = new ProfileService();

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: API for managing profiles
 */
export class ProfileController {
   /**
   * Retrieve all profiles
   * @swagger
   * /profiles:
   *   get:
   *     summary: Retrieve all profiles
   *     tags: [Profiles]
   *     responses:
   *       200:
   *         description: A list of profiles
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ProfileResponse'
   *       404:
   *         description: No profiles found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const profiles = await profileService.getAllProfiles();
      if (!profiles.length) {
        res.status(404).json({ message: 'No profiles found' });
        return;
      }
      res.status(200).json(profiles);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

   /**
   * Get profile by ID
   * @swagger
   * /profiles/{id}:
   *   get:
   *     summary: Get profile by ID
   *     tags: [Profiles]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the profile
   *     responses:
   *       200:
   *         description: A profile object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *       404:
   *         description: Profile not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const profile = await profileService.getProfileByParams({ id });
      if (!profile) {
        res.status(404).json({ message: 'Profile not found' });
        return;
      }
      res.status(200).json(profile);
    } catch (error) {
      logger(`Error in getByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }


    /**
    * Create a new profile
    * @swagger
    * /profiles:
    *   post:
    *     summary: Create a new profile
    *     tags: [Profiles]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/Profile'
    *     responses:
    *       201:
    *         description: Profile created
    *         content:
    *           application/json:
    *             schema:
    *               $ref: '#/components/schemas/ProfileResponse'
    *       400:
    *         description: Profile creation failed
    *       500:
    *         description: Internal Server Error
    */
  async create(req: Request, res: Response): Promise<void> {
    try {
      validateProfile(req, res, () => {
      }); // Validation middleware
      const newProfile = await profileService.createProfile(req.body);
      if (!newProfile) {
        res.status(400).json({ message: 'Profile creation failed' });
        return;
      }
      res.status(201).json(newProfile);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Update a profile by ID
   * @swagger
   * /profiles/{id}:
   *   put:
   *     summary: Update a profile by ID
   *     tags: [Profiles]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the profile
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Profile'
   *     responses:
   *       200:
   *         description: Profile updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *       400:
   *         description: Profile update failed
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      validateProfile(req, res, () => {
      }); // Validation middleware
      const updatedProfile = await profileService.updateProfileByParams({ id }, req.body);
      if (!updatedProfile) {
        res.status(400).json({ message: 'Profile update failed' });
        return;
      }
      res.status(200).json(updatedProfile);
    } catch (error) {
      logger(`Error in updateByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Delete a profile by ID
   * @swagger
   * /profiles/{id}:
   *   delete:
   *     summary: Delete a profile by ID
   *     tags: [Profiles]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the profile
   *     responses:
   *       204:
   *         description: Profile deleted
   *       404:
   *         description: Profile not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const deletedProfile = await profileService.deleteProfileByParams({ id });
      if (!deletedProfile) {
        res.status(404).json({ message: 'Profile not found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      logger(`Error in deleteByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Delete all profiles
   * @swagger
   * /profiles:
   *   delete:
   *     summary: Delete all profiles
   *     tags: [Profiles]
   *     responses:
   *       204:
   *         description: Profiles deleted
   *       404:
   *         description: No profiles found
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedProfiles = await profileService.deleteAllProfiles();
      if (!deletedProfiles) {
        res.status(404).json({ message: 'No profiles found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}