import prisma from '../prisma/client';
import { User } from '../models/user.model';
import { mapPrismaUserToInterface } from '../utils/mapping';

export const getAllUsers = async (): Promise<User[]> => {
  const prismaUsers = await prisma.user.findMany();
  return prismaUsers.map(mapPrismaUserToInterface);
};

export const createUser = async (data: Omit<User, 'id'>): Promise<User> => {
  const prismaUser = await prisma.user.create({
    data: {
      isAdmin: false,
      email: data.email,
      lastName: data.lastName,
      firstName: data.firstName,
      password: data.password,
      phoneNumber: data.phoneNumber,
      username: data.username,
    },
  });
  return mapPrismaUserToInterface(prismaUser);
};

export const getUserById = async (id: number): Promise<User | null> => {
  const prismaUser = await prisma.user.findUnique({
    where: { id },
  });
  return prismaUser ? mapPrismaUserToInterface(prismaUser) : null;
};

export const updateUser = async (
  id: number,
  data: Partial<Omit<User, 'id'>>
): Promise<User> => {
  const prismaUser = await prisma.user.update({
    where: { id },
    data: {
      isAdmin: data.isAdmin,
      email: data.email,
      lastName: data.lastName,
      firstName: data.firstName,
      password: data.password,
      phoneNumber: data.phoneNumber,
      username: data.username,
    },
  });
  return mapPrismaUserToInterface(prismaUser);
};

export const deleteUser = async (id: number): Promise<User> => {
  const prismaUser = await prisma.user.delete({
    where: { id },
  });
  return mapPrismaUserToInterface(prismaUser);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const prismaUser = await prisma.user.findUnique({
    where: { email },
  });
  return prismaUser ? mapPrismaUserToInterface(prismaUser) : null;
};
