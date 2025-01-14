import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { FavoriteService } from '../services/favorite.service';

const favoriteService = new FavoriteService();

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: API for managing favorites
 */
export class FavoriteController {

  /**
   * @swagger
   * /api/favorites:
   *   post:
   *     summary: Create a favorite
   *     tags: [Favorites]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: integer
   *               projectId:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Favorite created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Favorite'
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal Server Error
   */
  async createFavorite(req: Request, res: Response): Promise<void> {
    try {
      const favorite = await favoriteService.createFavorite({
        userId: req.body.userId,
        projectId: req.body.projectId,
      });
      if (!favorite) {
        res.status(400).json({ message: 'Bad request' });
        return;
      }
      res.status(201).json(favorite);
    } catch (error) {
      logger(`Error in createFavorite: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}