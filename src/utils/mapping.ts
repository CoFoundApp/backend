import { User as PrismaUser } from '@prisma/client';
import { User } from '../models/user.model';

export const mapPrismaUserToInterface = (prismaUser: PrismaUser): User => ({
  id: BigInt(prismaUser.id),
  isAdmin: prismaUser.isAdmin,
  email: prismaUser.email,
  lastName: prismaUser.lastName,
  firstName: prismaUser.firstName,
  password: prismaUser.password,
  phoneNumber: prismaUser.phoneNumber ?? undefined,
  username: prismaUser.username,
});
