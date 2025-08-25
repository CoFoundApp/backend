import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContext } from './request-context.service';

@Global()
@Module({
  providers: [RequestContext, PrismaService],
  exports: [RequestContext, PrismaService],
})
export class PrismaModule {}
