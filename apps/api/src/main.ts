import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './infra/ws/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Si tu es derrière un proxy / HTTPS (Nginx/Traefik), requis pour cookies "secure"
  app.getHttpAdapter().getInstance().set('trust proxy', 1); // <— AJOUT

  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: allowedOrigin === '*' ? true : allowedOrigin.split(','),
    credentials: true,
  });

  // Cookies (secret optionnel si tu signes certains cookies)
  app.use(cookieParser(process.env.COOKIE_SECRET)); // <— AJOUT

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));

  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.use(compression());

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
  console.log(`🎉 API running on http://localhost:${port}/graphql 🎉`);
}
bootstrap();
