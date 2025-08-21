import { Inject } from '@nestjs/common';
import { Resolver, Query } from '@nestjs/graphql';
import { PrismaService } from './infra/prisma/prisma.service';
import type Redis from 'ioredis';
import { REDIS } from './infra/redis/redis.module';

@Resolver()
export class HealthResolver {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}
  @Query(() => String, { description: 'Simple health ping' })
  health(): string {
    return 'ok';
  }

  @Query(() => String, { description: 'Ping DB via Prisma' })
  async dbPing(): Promise<string> {
    // simple round-trip
    const now = await this.prisma.$queryRawUnsafe<{ now: Date }[]>("SELECT NOW()");
    return `db-ok:${now[0].now.toISOString()}`;
  }

  @Query(() => String, { description: 'Ping Redis' })
  async redisPing(): Promise<string> {
    const pong = await this.redis.ping();
    return `redis-ok:${pong}`;
  }
}
