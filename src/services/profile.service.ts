import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { Profile, ProfileResponse } from '../models/profile.model';

const prisma = new PrismaClient();

export class ProfileService {
  async getAllProfiles(): Promise<ProfileResponse[]> {
    try {
      const profiles = await prisma.profile.findMany(); // Removed unnecessary Promise.all
      if (!profiles.length) {
        return [];
      }
      const profileAsObject = profiles.map((profile) => new Profile(
        profile.id,
        profile.notifEmail,
        profile.notifPhone,
        profile.availability,
        profile.location,
        profile.userId,
        profile.notifPush,
        profile.topicId ? profile.topicId : undefined
      ));
      return profileAsObject.map((profile) => new ProfileResponse(profile));
    } catch (error) {
      logger(`Error in getAllProfiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getProfileByParams(params: { id: number }): Promise<ProfileResponse | null> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: Number(params.id) },
      });
      if (!profile) {
        return null;
      }
      const profileAsObject = new Profile(
        profile.id,
        profile.notifEmail,
        profile.notifPhone,
        profile.availability,
        profile.location,
        profile.userId,
        profile.notifPush,
        profile.topicId ? profile.topicId : undefined
      );
      return new ProfileResponse(profileAsObject);
    } catch (error) {
      logger(`Error in getProfileByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createProfile(data: Omit<Profile, 'id'>): Promise<ProfileResponse | null> {
    try {
      const profile = await prisma.profile.create({
        data: {
          ...data,
          userId: Number(data.userId),
          topicId: data.topicId ? Number(data.topicId) : undefined
        } as Prisma.ProfileCreateInput
      });
      const profileAsObject = new Profile(
        profile.id,
        profile.notifEmail,
        profile.notifPhone,
        profile.availability,
        profile.location,
        profile.userId,
        profile.notifPush,
        profile.topicId ? profile.topicId : undefined
      );
      return new ProfileResponse(profileAsObject);
    } catch (error) {
      logger(`Error in createProfile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateProfileByParams(
    params: { id: number },
    data: Partial<Profile>
  ): Promise<ProfileResponse | null> {
    try {
      const profile = await prisma.profile.update({
        where: { id: params.id }, // Ensure `id` is a number
        data: data as Prisma.ProfileUpdateInput,
      });
      const profileAsObject = new Profile(
        profile.id,
        profile.notifEmail,
        profile.notifPhone,
        profile.availability,
        profile.location,
        profile.userId,
        profile.notifPush,
        profile.topicId ? profile.topicId : undefined
      );
      return new ProfileResponse(profileAsObject);
    } catch (error) {
      logger(`Error in updateProfileByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteAllProfiles(): Promise<number> {
    try {
      const result = await prisma.profile.deleteMany();
      const getProfile = await prisma.profile.findMany();
      if (getProfile.length) {
        return 0;
      }
      return result.count;
    } catch (error) {
      logger(`Error in deleteAllProfiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  async deleteProfileByParams(params: { id: number }): Promise<boolean> {
    try {
      await prisma.profile.delete({
        where: { id: params.id },
      });
      const getProfile = await prisma.profile.findUnique({
        where: { id: params.id },
      });
      return !getProfile; // Return true if profile is deleted
    } catch (error) {
      logger(`Error in deleteProfileByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}