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
import { ProfileModule } from './modules/profile/profile.module';
import { UserModule } from './modules/user/user.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { MatchingModule } from './modules/matching/matching.module';
import { ProjectModule } from './modules/projects/project.module';
import { ProjectApplicationModule } from './modules/project_applications/project-application.module';
import { ProjectPositionModule } from './modules/project-position/project-position.module';

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

    UserModule,

    ProfileModule,

    TaxonomyModule,

    EmbeddingModule,

    MatchingModule,

    ProjectModule,

    ProjectApplicationModule,

    ProjectPositionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HealthResolver,
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
  ],
})
export class AppModule {}
