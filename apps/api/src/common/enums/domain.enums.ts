import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INVITED = 'invited',
  DELETED = 'deleted',
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

export enum LanguageCode {
  FR = 'fr',
  EN = 'en',
  ES = 'es',
  DE = 'de',
  IT = 'it',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  SEEKING = 'seeking',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ProjectStage {
  IDEA = 'idea',
  MVP = 'mvp',
  TRACTION = 'traction',
  SCALE = 'scale',
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  MENTOR = 'mentor',
}

export enum MemberStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  LEFT = 'left',
  REMOVED = 'removed',
}

registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(UserStatus, { name: 'UserStatus' });
registerEnumType(ProfileVisibility, { name: 'ProfileVisibility' });
registerEnumType(LanguageCode, { name: 'LanguageCode' });
registerEnumType(ProjectStatus, { name: 'ProjectStatus' });
registerEnumType(ProjectStage, { name: 'ProjectStage' });
registerEnumType(MemberRole, { name: 'MemberRole' });
registerEnumType(MemberStatus, { name: 'MemberStatus' });
