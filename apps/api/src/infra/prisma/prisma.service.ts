import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Exécute des requêtes dans une transaction avec RLS context (GUC Postgres).
   * Le client transactionnel est de type Prisma.TransactionClient (et non PrismaClient).
   */
  async withUserContext<T>(
    userId: string | null,
    role: string | null,
    handler: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (userId) await tx.$executeRawUnsafe(`SET app.user_id = '${userId}'`);
      if (role) await tx.$executeRawUnsafe(`SET app.role = '${role}'`);
      return handler(tx);
    });
  }

  /**
   * (Optionnel) Si tu veux fermer Nest quand le process Node émet 'beforeExit',
   * utilise process.on plutôt que Prisma.$on pour éviter les warnings de types.
   */
  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
