import { registerEnumType } from '@nestjs/graphql';

export enum MatchDetailLevel {
  BASIC = 'basic',
  ENRICHED = 'enriched',
  COMPETITIVE = 'competitive',
  BIDIRECTIONAL = 'bidirectional',
}

registerEnumType(MatchDetailLevel, { name: 'MatchDetailLevel' });
