import { registerEnumType } from '@nestjs/graphql';
export enum Role {
  user = 'user',
  moderator = 'moderator',
  admin = 'admin',
}
registerEnumType(Role, { name: 'Role' });
