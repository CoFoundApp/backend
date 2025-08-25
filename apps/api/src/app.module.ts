import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthResolver } from './health.resolver';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RlsInterceptor } from './infra/prisma/rls.interceptor';

import { envValidationSchema } from './config/env.validation';

import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { QueuesFeatureModule } from './queue/queues.module';
import { SecurityModule } from './infra/security/security.module';
import { WsModule } from './modules/ws/ws.module';
import { HealthModule } from './infra/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsentModule } from './modules/consent/consent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req, res }: { req: Request, res: Response }) => ({ req, res }),
    }),

    HealthModule,

    SecurityModule,

    WsModule,

    PrismaModule,

    RedisModule,

    QueuesFeatureModule,

    AuthModule,

    ConsentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HealthResolver,
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
  ],
})
export class AppModule {}
