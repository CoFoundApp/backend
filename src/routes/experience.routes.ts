import express from 'express';
import {create, getAll, update, getOne, deleteExperience} from '../controllers/experience.controller';

const router = express.Router();

// Route definitions
router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteExperience);

export default router;
