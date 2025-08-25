import { Module, forwardRef } from '@nestjs/common';
import { SkillsResolver } from './skills.resolver';
import { InterestsResolver } from './interests.resolver';
import { SkillsService } from './skills.service';
import { InterestsService } from './interests.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Module({
  imports: [],
  providers: [
    PrismaService,
    SkillsService,
    InterestsService,
    SkillsResolver,
    InterestsResolver,
  ],
  exports: [SkillsService, InterestsService],
})
export class TaxonomyModule {}
