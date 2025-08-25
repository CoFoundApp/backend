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

registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(UserStatus, { name: 'UserStatus' });
registerEnumType(ProfileVisibility, { name: 'ProfileVisibility' });
registerEnumType(LanguageCode, { name: 'LanguageCode' });
