import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './infra/ws/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({ origin: allowedOrigin === '*' ? true : allowedOrigin.split(','), credentials: true });

  // Sécurité HTTP
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));

  // Limites de payload
  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));

  // Compression
  app.use(compression());

  // Validation globale (DTOs)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🎉 API running on http://localhost:${port}/graphql 🎉`);
}
bootstrap();
