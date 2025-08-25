import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '@prisma/client';

type Store = { tx?: Prisma.TransactionClient; userId?: string | null; role?: string | null };

@Injectable()
export class RequestContext {
  private readonly als = new AsyncLocalStorage<Store>();

  run<T>(store: Store, fn: () => Promise<T>) {
    return this.als.run(store, fn);
  }

  get store(): Store | undefined {
    return this.als.getStore();
  }

  setTx(tx: Prisma.TransactionClient) {
    const s = this.als.getStore();
    if (s) s.tx = tx;
  }

  get tx(): Prisma.TransactionClient | undefined {
    return this.als.getStore()?.tx;
  }

  get userId(): string | null | undefined {
    return this.als.getStore()?.userId;
  }

  get role(): string | null | undefined {
    return this.als.getStore()?.role;
  }
}
