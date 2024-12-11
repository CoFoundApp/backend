import express from 'express';
import {
  create,
  getAll,
  getOne,
  update,
  deleteApplication,
} from '../controllers/application.controller';

const router = express.Router();

// Route definitions
router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteApplication);

export default router;
