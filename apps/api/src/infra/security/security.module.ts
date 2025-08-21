import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GqlThrottlerGuard } from './gql-throttler.guard';

const ttl = Number(process.env.RATE_LIMIT_TTL || 60);
const limit = Number(process.env.RATE_LIMIT_MAX || 100);

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl, limit }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class SecurityModule {}
