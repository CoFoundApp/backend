import express from 'express';
import { create, getAll, getOne, update, deleteUser } from '../controllers/user.controller';

const router = express.Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteUser);

export default router;
