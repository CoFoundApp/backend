import { Module, forwardRef } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [forwardRef(() => ProfileModule)],
  providers: [UserResolver, UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
