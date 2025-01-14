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
   * @swagger
   * /users:
   *   get:
   *     summary: Retrieve all users
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/UserResponse'
   *       404:
   *         description: No users found
   *       500:
   *         description: Internal Server Error
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
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     responses:
   *       200:
   *         description: A user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal Server Error
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
   * @swagger
   * /users:
   *   post:
   *     summary: Create a new user
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       201:
   *         description: User created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
   *       400:
   *         description: User not created, email or username already exist
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      validateUser(req, res, () => {}); // Validation middleware
      const newUser = await userService.createUser(req.body);
      if (!newUser) {
        res.status(400).json({ message: 'User not created, email or username already exist' });
        return;
      }
      res.status(201).json(newUser);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Update user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       200:
   *         description: User updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
   *       400:
   *         description: User not updated
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal Server Error
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
   * @swagger
   * /users:
   *   delete:
   *     summary: Delete all users
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: All users deleted
   *       400:
   *         description: Users not deleted
   *       500:
   *         description: Internal Server Error
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
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: User ID
   *     responses:
   *       200:
   *         description: User with ID deleted successfully
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal Server Error
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
