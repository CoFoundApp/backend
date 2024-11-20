import { Request, Response } from 'express';
import { getAllUsers, createUser, getUserById as getUserByIdService } from '../services/user.service';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: (error as any).message });
  }
};

export const addUser = async (req: Request, res: Response) => {
  try {
    const { email, username, first_name, last_name, password } = req.body;
    const user = await createUser({
      email, first_name, last_name, password,username,
      is_admin: false
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: (error as any).message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdService(Number(id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: (error as any).message });
  }
};
