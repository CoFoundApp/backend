import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { User, UserResponse } from '../models/user.model';

const prisma = new PrismaClient();

export class UserService {
  async getAllUsers(): Promise<UserResponse[]> {
    try {
      const users = await prisma.user.findMany(); // Removed unnecessary Promise.all
      if (!users.length) {
        return [];
      }
      return users.map((user) => new UserResponse(user));
    } catch (error) {
      logger(`Error in getAllUsers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getUserByParams(params: { id: number }): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: params.id }, // Ensure `id` is a number
      });
      if (!user) {
        return null;
      }
      return new UserResponse(user);
    } catch (error) {
      logger(`Error in getUserByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createUser(data: Omit<User, 'id'>): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.create({ data: data as Prisma.UserCreateInput });
      return new UserResponse(user);
    } catch (error) {
      logger(`Error in createUser: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateUserByParams(
    params: { id: number },
    data: Partial<User>
  ): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.update({
        where: { id: params.id }, // Ensure `id` is a number
        data: data as Prisma.UserUpdateInput,
      });
      return new UserResponse(user);
    } catch (error) {
      logger(`Error in updateUserByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteAllUsers(): Promise<number> {
    try {
      const result = await prisma.user.deleteMany();
      return result.count;
    } catch (error) {
      logger(`Error in deleteAllUsers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  async deleteUserByParams(params: { id: number }): Promise<number | null> {
    try {
      const user = await prisma.user.delete({
        where: { id: params.id }, // Ensure `id` is a number
      });
      return user ? 1 : null;
    } catch (error) {
      logger(`Error in deleteUserByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}
