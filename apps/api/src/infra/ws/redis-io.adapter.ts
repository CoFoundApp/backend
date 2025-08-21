import { INestApplication, Injectable } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
import type { ServerOptions } from 'socket.io';

@Injectable()
export class RedisIoAdapter extends IoAdapter {
  private pubClient!: Redis;
  private subClient!: Redis;

  constructor(private app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    const opts: RedisOptions = {
      lazyConnect: true,
      retryStrategy: (attempt) => Math.min(2000, attempt * 200),
    };

    this.pubClient = new Redis(url, opts);
    this.subClient = new Redis(url, opts);

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      cors: { origin: true, credentials: true },
      ...options,
    });
    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }
}
