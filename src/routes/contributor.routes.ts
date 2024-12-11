import express from 'express';
import {
  create,
  getAll,
  getOne,
  update,
  deleteContributor,
} from '../controllers/contributor.controller';

const router = express.Router();

// Route Definitions
router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteContributor);

export default router;
