import { registerEnumType } from '@nestjs/graphql';
export enum Role {
  user = 'user',
  moderator = 'moderator',
  creator = 'creator',
  admin = 'admin',
}
registerEnumType(Role, { name: 'Role' });
