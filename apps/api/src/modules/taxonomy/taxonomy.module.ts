import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SkillsService } from './skills.service';
import { SkillsResolver } from './skills.resolver';
import { InterestsService } from './interests.service';
import { InterestsResolver } from './interests.resolver';
import { QueuesFeatureModule } from '../../queue/queues.module';

@Module({
  imports: [
    QueuesFeatureModule,
  ],
  providers: [
    PrismaService,
    SkillsService,
    SkillsResolver,
    InterestsService,
    InterestsResolver,
  ],
  exports: [SkillsService, InterestsService],
})
export class TaxonomyModule {}
