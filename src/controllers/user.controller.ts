import { Request, Response } from 'express';
import {
  getAllUsers,
  createUser as createUserService,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  getUserByEmail,
} from '../services/user.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users: User[] = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
    return;
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isAdmin, email, lastName, firstName, password, phoneNumber, username } =
      req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserService({
      isAdmin,
      email,
      lastName,
      firstName,
      password: hashedPassword,
      phoneNumber,
      username,
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await getUserByIdService(Number(id));
    if (!user) {
      res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updatedUser = await updateUserService(Number(id), data);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await deleteUserService(Number(id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      res.status(404).json({ message: 'Email ou mot de passe incorrect' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
