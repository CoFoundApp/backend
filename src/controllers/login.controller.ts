import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { LoginService } from '../services/login.service';

const loginService = new LoginService();

//swagger
/**
 * @swagger
 * tags:
 *   name: Login
 *   description: API for managing login
 */
export class LoginController {

  /**
   * @swagger
   * /login:
   *   post:
   *     summary: Login
   *     tags: [Login]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal Server Error
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const token = await loginService.login({ email, password });
      if (!token) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.status(200).json({ token });
    } catch (error) {
      logger(`Error in login: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /checkToken:
   *   post:
   *     summary: Check token
   *     tags: [Login]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token is valid
   *       401:
   *         description: Token is invalid
   */
  async checkToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      const isValid = loginService.checkToken(token);
      if (!isValid) {
        res.status(401).json({ message: 'Token is invalid' });
        return;
      }
      res.status(200).json({ message: 'Token is valid' });
    } catch (error) {
      logger(`Error in checkToken: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /username:
   *   post:
   *     summary: Login with username
   *     tags: [Login]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal Server Error
   */
  async loginWithUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const token = await loginService.loginWithUsername({ username, password });
      if (!token) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.status(200).json({ token });
    } catch (error) {
      logger(`Error in loginWithUsername: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}