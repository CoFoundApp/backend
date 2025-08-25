import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateInterestInput } from './dto/create-interest.input';
import { slugify } from '../../common/utils/slug.util';
import { ListArgs } from './dto/list.args';
import { makeCursorPage } from '../../common/utils/pagination.util';
import type { Prisma, PrismaClient } from '@prisma/client';
import { toVectorLiteral } from '../../common/utils/vector.util';

@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreateInterest(input: CreateInterestInput) {
    const name = input.name.trim();
    const slug = slugify(name);

    try {
      return await this.prisma.prisma().interests.create({
        data: { name, category: input.category ?? null, slug },
        select: { id: true, name: true, category: true, slug: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Interest with same name or slug already exists');
      throw e;
    }
  }

  async adminListInterests(args: ListArgs) {
    return this.listInterests(args);
  }

  async listInterests({ q, category, limit, cursor }: ListArgs) {
    const where: any = {};
    if (q?.trim()) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { slug: { contains: slugify(term), mode: 'insensitive' } },
      ];
    }
    if (category?.trim()) where.category = { equals: category.trim(), mode: 'insensitive' };

    const take = limit ?? 20;

    const items = await this.prisma.prisma().interests.findMany({
      where,
      orderBy: { name: 'asc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, name: true, category: true, slug: true },
    });

    return makeCursorPage(items, take);
  }

  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    return this.prisma.prisma().interests.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, slug: true },
    });
  }

  /** Lien user <-> interests via pivot user_interests */
  async attachToUser(userId: string, addIds: string[] = [], removeIds: string[] = []) {
    const prisma = this.prisma.prisma();
    const ops: Prisma.PrismaPromise<any>[] = [];

    if (addIds.length) {
      ops.push(
        prisma.user_interests.createMany({
          data: addIds.map((interest_id) => ({ user_id: userId, interest_id })),
          skipDuplicates: true,
        })
      );
    }
    if (removeIds.length) {
      ops.push(
        prisma.user_interests.deleteMany({
          where: { user_id: userId, interest_id: { in: removeIds } },
        })
      );
    }
    if (!ops.length) return true;

    await (prisma as unknown as PrismaClient).$transaction(ops);
    return true;
  }

  async listByUser(userId: string) {
    const rows = await this.prisma.prisma().user_interests.findMany({
      where: { user_id: userId },
      include: {
        interests: { select: { id: true, name: true, category: true, slug: true } },
      },
      orderBy: { interests: { name: 'asc' } },
    });
    return rows.map((r) => r.interests);
  }

    async setInterestEmbedding(interestId: string, vec: number[], dim = 1536) {
    const lit = toVectorLiteral(vec, dim);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE interests SET embedding = '${lit}'::vector WHERE id = $1`,
      interestId,
    );
    return true;
  }

  async searchInterestsByEmbedding(vec: number[], limit = 10, dim = 1536) {
    const lit = toVectorLiteral(vec, dim);
    return this.prisma.prisma().$queryRawUnsafe<
      Array<{ id: string; name: string; category: string | null; slug: string | null; distance: number }>
    >(
      `
      SELECT id, name, category, slug, (embedding <=> '${lit}'::vector) AS distance
      FROM interests
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::vector
      LIMIT $1
      `,
      limit,
    );
  }
}
