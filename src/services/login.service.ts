import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class LoginService {
  async login(data: { email: string, password: string }): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (!user) {
        console.log('User not found');
        return null;
      }
      const isPasswordValid = bcrypt.compareSync(data.password, user.password);
      if (!isPasswordValid) {
        console.log('Invalid password');
        return null;
      }

      const secret = process.env.JWT_SECRET || 'cofound';
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
      }

      const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });
      return token;
    } catch (err) {
      logger(`Error in login: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }

  async loginWithUsername(data: { username: string, password: string }): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (!user) {
        return null;
      }
      const isPasswordValid = bcrypt.compareSync(data.password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      const secret = process.env.JWT_SECRET || 'cofound';
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
      }

      const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });
      return token;
    } catch (err) {
      logger(`Error in login: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }

  encryptPassword(password: string): string {
    return bcrypt.hashSync(password);
  }

  getUserIDFromToken(token: string): number {
    const secret = process.env.JWT_SECRET || 'cofound';
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }
    const decoded = jwt.verify(token, secret) as { id: number };
    return decoded.id;
  }

  checkToken(token: string): boolean {
    const secret = process.env.JWT_SECRET || 'cofound';
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    try {
      jwt.verify(token, secret);
      return true;
    } catch {
      return false;
    }
  }
}