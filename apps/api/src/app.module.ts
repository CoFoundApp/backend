import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { Request, Response } from 'express';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthResolver } from './health.resolver';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { QueuesFeatureModule } from './queue/queues.module';
import { WsModule } from './modules/ws/ws.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req, res }: { req: Request, res: Response }) => ({ req, res }),
    }),

    WsModule,

    PrismaModule,

    RedisModule,

    QueuesFeatureModule,
  ],
  controllers: [AppController],
  providers: [AppService, HealthResolver],
})
export class AppModule {}
