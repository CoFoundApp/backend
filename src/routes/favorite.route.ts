import { Router } from 'express';
import { FavoriteController } from '../controllers/favorites.controller';

const router = Router();

const favoriteController = new FavoriteController();

router.post('/', favoriteController.createFavorite);

export default router;