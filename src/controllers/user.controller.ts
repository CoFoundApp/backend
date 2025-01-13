import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { UserService } from '../services/user.service';
import { validateUser } from '../validators/user.validator';

const userService = new UserService();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for managing users
 */
export class UserController {
  /**
   * Retrieve all users
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      if (!users.length) {
        res.status(404).json({ message: 'No users found' });
        return;
      }
      res.status(200).json(users);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Get user by ID
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const user = await userService.getUserByParams({ id });
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      logger(`Error in getByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Create a new user
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      validateUser(req, res, () => {}); // Validation middleware
      const newUser = await userService.createUser(req.body);
      if (!newUser) {
        res.status(400).json({ message: 'User not created' });
        return;
      }
      res.status(201).json(newUser);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Update a user by ID
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const userToUpdate = await userService.getUserByParams({ id });
      if (!userToUpdate) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      const updatedUser = await userService.updateUserByParams({ id }, req.body);
      if (!updatedUser) {
        res.status(400).json({ message: 'User not updated' });
        return;
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      logger(`Error in updateByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Delete all users
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedUsers = await userService.deleteAllUsers();
      const getAllUsers = await userService.getAllUsers();
      if (getAllUsers.length) {
        res.status(400).json({ message: 'Users not deleted' });
        return;
      }
      res.status(200).json({ message: `${deletedUsers} users deleted` });
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Delete a user by ID
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const userToDelete = await userService.getUserByParams({ id });
      if (!userToDelete) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      const deletedUser = await userService.deleteUserByParams({ id });
      if (!deletedUser) {
        res.status(400).json({ message: 'User not deleted' });
        return;
      }
      res.status(200).json({ message: `User with ID ${id} deleted successfully` });
    } catch (error) {
      logger(`Error in deleteByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
