import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './infra/ws/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🎉 API running on http://localhost:${port}/graphql 🎉`);
}
bootstrap();
