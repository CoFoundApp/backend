import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ConsentService } from './consent.service';
import { ConsentResolver } from './consent.resolver';

@Module({
  imports: [PrismaModule],
  providers: [ConsentService, ConsentResolver],
})
export class ConsentModule {}
