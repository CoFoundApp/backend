import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RequestContext } from './request-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ctx: RequestContext) {
    super();
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  /** Retourne le client transactionnel si présent, sinon le client global */
  prisma(): Prisma.TransactionClient | PrismaService {
    return this.ctx.tx ?? this;
  }

  /** Utilitaire conservé (optionnel) */
  async withUserContext<T>(
    userId: string | null,
    role: string | null,
    handler: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (userId) await tx.$executeRaw`SET app.user_id = ${userId}`;
      if (role) await tx.$executeRaw`SET app.role = ${role}`;
      return handler(tx);
    });
  }
}
