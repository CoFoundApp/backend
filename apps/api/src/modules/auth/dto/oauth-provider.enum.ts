import { registerEnumType } from '@nestjs/graphql';

export enum OAuthProvider {
  Google = 'google',
  LinkedIn = 'linkedin',
}

registerEnumType(OAuthProvider, { name: 'OAuthProvider' });
