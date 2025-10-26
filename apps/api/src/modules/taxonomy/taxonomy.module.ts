import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SkillsService } from './skills.service';
import { SkillsResolver } from './skills.resolver';
import { InterestsService } from './interests.service';
import { InterestsResolver } from './interests.resolver';
import { QueuesFeatureModule } from '../../queue/queues.module';
import { AutoTaxonomyService } from './auto-taxonomy.service';

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
    AutoTaxonomyService,
  ],
  exports: [SkillsService, InterestsService, AutoTaxonomyService],
})
export class TaxonomyModule {}
