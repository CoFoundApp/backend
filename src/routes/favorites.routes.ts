import express from 'express';
import { create, getAll, getByUser, deleteFavorite } from '../controllers/favorites.controller';

const router = express.Router();

// Route definitions
router.post('/', create);
router.get('/', getAll);
router.get('/:userId', getByUser);
router.delete('/:userId/:projectId', deleteFavorite);

export default router;
