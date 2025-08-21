import { Resolver, Query } from '@nestjs/graphql';
import { PrismaService } from './infra/prisma/prisma.service';

@Resolver()
export class HealthResolver {
  constructor(private readonly prisma: PrismaService) {}
  @Query(() => String, { description: 'Simple health ping' })
  health(): string {
    return 'ok';
  }

  @Query(() => String, { description: 'Ping DB via Prisma' })
  async dbPing(): Promise<string> {
    // simple round-trip
    const now = await this.prisma.$queryRawUnsafe<{ now: Date }[]>("SELECT NOW()");
    return `db-ok:${now[0].now.toISOString()}`;
  }
}
