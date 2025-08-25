import type { Prisma } from '@prisma/client';
import { UserRole, UserStatus, ProfileVisibility } from './domain.enums';

export const mapRoleToPrisma = (role: UserRole): Prisma.UsersScalarFieldEnum | any => {
  return role as unknown as any;
};

export const mapStatusToPrisma = (status: UserStatus): any => {
  return status as unknown as any;
};

export const mapVisibilityToPrisma = (v: ProfileVisibility): any => {
  return v as unknown as any;
};
