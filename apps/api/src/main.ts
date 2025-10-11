import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './infra/ws/redis-io.adapter';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import express, { json, urlencoded } from 'express';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  const origins = allowedOrigin === '*' ? true : allowedOrigin.split(',').map(o => o.trim());

  console.log('🌐 CORS enabled for origins:', origins);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Apollo-Require-Preflight'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.use('/stripe/webhook', express.raw({ type: '*/*' }));

  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              directives: {
                ...cspDirectives,
                'img-src': ["'self'", '', 'https://cdn.jsdelivr.net'],
                'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
              },
            }
          : false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 10 }));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`🎉 API running on http://localhost:${port}/graphql 🎉`);
  console.log(`📝 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🍪 COOKIE_BASE_DOMAIN: ${process.env.COOKIE_BASE_DOMAIN}`);
}
bootstrap();
