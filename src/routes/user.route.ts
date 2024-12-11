import express from 'express';
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
} from '../controllers/user.controller';
import { validateUser, validateLogin } from '../validators/user.validator';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/', authMiddleware, getUsers);

router.post('/', validateUser, createUser);

router.get('/:id', authMiddleware, getUserById);

router.put('/:id', authMiddleware, validateUser, updateUser);

router.delete('/:id', authMiddleware, deleteUser);

router.post('/login', validateLogin, loginUser);

export default router;
