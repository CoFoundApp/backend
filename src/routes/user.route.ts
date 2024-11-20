import express from 'express';
import prisma from '../prisma/client';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { email, username, first_name, last_name, password } = req.body;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        first_name,
        last_name,
        password,
        is_admin: false,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: (error as any).message });
  }
});

export default router;
