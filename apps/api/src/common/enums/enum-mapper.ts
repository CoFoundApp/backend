import type { Prisma } from '@prisma/client';
import {
  UserRole,
  UserStatus,
  ProfileVisibility,
  ProjectStatus,
  ProjectStage,
  MemberRole,
  MemberStatus,
  ApplicationStatus,
  PositionStatus,
  InvitationStatus,
} from './domain.enums';

export const mapRoleToPrisma = (role: UserRole): Prisma.UsersScalarFieldEnum | any => {
  return role as unknown as any;
};

export const mapStatusToPrisma = (status: UserStatus): any => {
  return status as unknown as any;
};

export const mapVisibilityToPrisma = (v: ProfileVisibility): any => {
  return v as unknown as any;
};

export const mapProjectStatusToPrisma = (s: ProjectStatus): any => {
  return s as unknown as any;
};

export const mapProjectStageToPrisma = (s: ProjectStage): any => {
  return s as unknown as any;
};

export const mapMemberRoleToPrisma = (r: MemberRole): any => {
  return r as unknown as any;
};

export const mapMemberStatusToPrisma = (s: MemberStatus): any => {
  return s as unknown as any;
};

export const mapApplicationStatusToPrisma = (s: ApplicationStatus): any => {
  return s as unknown as any;
};

export const mapPositionStatusToPrisma = (s: PositionStatus): any => {
  return s as unknown as any;
};

export const mapInvitationStatusToPrisma = (s: InvitationStatus): any => {
  return s as unknown as any;
};
