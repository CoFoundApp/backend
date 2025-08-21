// apps/api/src/infra/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

export const REDIS = Symbol('REDIS');

function makeRedis(): Redis {
  const url = process.env.REDIS_URL || 'redis://redis:6379';
  const opts: RedisOptions = {
    lazyConnect: true,
    // backoff exponentiel jusqu'à 2s
    retryStrategy: (attempt) => Math.min(2000, attempt * 200),
    reconnectOnError: (err) => {
      // Reconnect sur MOVED/CLUSTERDOWN, etc.
      return /READONLY|MOVED|CLUSTERDOWN/.test(err.message);
    },
  };
  const client = new Redis(url, opts);

  client.on('ready',   () => console.log('[redis] ready'));
  client.on('connect', () => console.log('[redis] connect'));
  client.on('error',   (e) => console.error('[redis] error', e.message));
  client.on('end',     () => console.warn('[redis] end'));

  client.connect().catch((e) => console.error('[redis] connect err', e.message));
  return client;
}

@Global()
@Module({
  providers: [{ provide: REDIS, useFactory: makeRedis }],
  exports: [REDIS],
})
export class RedisModule {}
