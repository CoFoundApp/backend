import { Router } from 'express';
import prisma from '../prisma/client';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// Create a user
router.post('/', async (req, res) => {
  const { email, name } = req.body;
  const user = await prisma.user.create({
    data: { email, name },
  });
  res.status(201).json(user);
});

export default router;
