import { registerEnumType } from '@nestjs/graphql';

export enum MatchEntityType {
  PROFILE = 'profile',
  PROJECT = 'project',
}

registerEnumType(MatchEntityType, {
  name: 'MatchEntityType',
  description: 'Type d\'entité à l\'origine du match (profil ou projet)',
});
