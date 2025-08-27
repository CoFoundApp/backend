import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProfileService } from './profile.service';
import { ProfileResolver } from './profile.resolver';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AuthModule } from '../auth/auth.module';
import { QueuesFeatureModule } from '../../queue/queues.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    TaxonomyModule,
    EmbeddingModule,
    QueuesFeatureModule,
  ],
  providers: [PrismaService, ProfileService, ProfileResolver],
  exports: [ProfileService],
})
export class ProfileModule {}
