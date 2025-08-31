import { registerEnumType } from '@nestjs/graphql';

export enum MatchMode {
  BY_TEXT = 'BY_TEXT',
  BY_PROJECT = 'BY_PROJECT',
  BY_PROFILE = 'BY_PROFILE',
}

registerEnumType(MatchMode, { name: 'MatchMode' });
