import { Module, forwardRef } from '@nestjs/common';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [ProfileResolver, ProfileService, PrismaService],
  exports: [ProfileService],
})
export class ProfileModule {}
