import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS } from '../redis/redis.module';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // Liveness: ne dépend d’aucun service externe (répond vite).
  @Get('/healthz')
  liveness() {
    return { status: 'ok' };
  }

  // Readiness: vérifie DB + Redis (et échoue en 503 si KO).
  @Get('/readyz')
  async readiness() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {
      db: { ok: false },
      redis: { ok: false },
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db.ok = true;
    } catch (e: any) {
      checks.db = { ok: false, detail: String(e?.message ?? e) };
    }

    try {
      const pong = await this.redis.ping();
      checks.redis.ok = pong === 'PONG';
      if (!checks.redis.ok) checks.redis.detail = `ping=${pong}`;
    } catch (e: any) {
      checks.redis = { ok: false, detail: String(e?.message ?? e) };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    if (!allOk) {
      throw new ServiceUnavailableException({ status: 'fail', checks });
    }
    return { status: 'ok', checks };
  }
}
