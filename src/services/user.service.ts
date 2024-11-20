import prisma from '../prisma/client';

export const getAllUsers = async () => {
  return await prisma.user.findMany();
};

export const createUser = async (data: { email: string; first_name: string; last_name: string; password: string; is_admin: boolean; username: string }) => {
  return await prisma.user.create({
    data,
  });
};

export const getUserById = async (id: number) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};
