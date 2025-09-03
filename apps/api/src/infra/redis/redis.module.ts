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
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        const client = new Redis(url, { lazyConnect: true });
        client.connect().catch((err: unknown) => console.error('[redis] connect err', err));

        // fermeture propre pour Jest & app
        const close = async () => {
          try { await client.quit(); } catch { client.disconnect(); }
        };
        process.once('beforeExit', close);
        process.once('SIGINT', close);
        process.once('SIGTERM', close);

        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
