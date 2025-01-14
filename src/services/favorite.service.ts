import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { FavoritesByProject, FavoritesByUser } from '../models/favorite.model';

const prisma = new PrismaClient();

export class FavoriteService {
  async createFavorite({ userId, projectId }: { userId: number; projectId: number }) {
    try {
      // Check if the favorite already exists
      const existingFavorite = await prisma.favorites.findUnique({
        where: {
          projectId_userId: {
            userId: userId,
            projectId: projectId,
          },
        },
      });

      if (existingFavorite) {
        // Return the existing favorite or handle it as needed
        return existingFavorite;
      }

      // Create a new favorite
      const favorite = await prisma.favorites.create({
        data: {
          userId,
          projectId,
        },
      });

      return favorite;
    } catch (error) {
      logger(`Error in createFavorite: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async getFavoritesByUserId(userId: number): Promise<FavoritesByUser | []> {
    try {
      const favoritesRaw = await prisma.favorites.findMany({
        where: {
          userId: userId,
        },
      });
      if (!favoritesRaw.length) {
        return [];
      }

      const favorites = new FavoritesByUser(favoritesRaw[0].userId, favoritesRaw.map((favorite) => favorite.projectId));
      if (!favorites) {
        return [];
      }
      return favorites;
    } catch (error) {
      logger(`Error in getFavoritesByUserId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getFavoritesByProjectId(projectId: number): Promise<FavoritesByProject | []> {
    try {
      const favoritesRaw = await prisma.favorites.findMany({
        where: {
          projectId: projectId,
        },
      });
      if (!favoritesRaw.length) {
        return [];
      }

      const favorites = new FavoritesByProject(favoritesRaw[0].projectId, favoritesRaw.map((favorite) => favorite.userId));
      if (!favorites) {
        return [];
      }
      return favorites;
    } catch (error) {
      logger(`Error in getFavoritesByProjectId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async deleteAllFavoritesByUserId(userId: number): Promise<boolean> {
    try {
      await prisma.favorites.deleteMany({
        where: {
          userId: userId,
        },
      });
      const favorites = await prisma.favorites.findMany({
        where: {
          userId: userId,
        },
      });
      return !favorites.length;
    } catch (error) {
      logger(`Error in deleteAllFavoritesByUserId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteAllFavoritesByProjectId(projectId: number): Promise<boolean> {
    try {
      await prisma.favorites.deleteMany({
        where: {
          projectId: projectId,
        },
      });
      const favorites = await prisma.favorites.findMany({
        where: {
          projectId: projectId,
        },
      });
      return !favorites.length;
    } catch (error) {
      logger(`Error in deleteAllFavoritesByProjectId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

}