import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateInterestInput } from './dto/create-interest.input';
import { slugify } from '../../common/utils/slug.util';
import { ListArgs } from './dto/list.args';
import { makeCursorPage } from '../../common/utils/pagination.util';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { isUuid } from '../../common/utils/uuid.util';

@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin create interest
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

  // Admin list interests
  async adminListInterests(args: ListArgs) {
    return this.listInterests(args);
  }

  // Liste d'intérêts
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

  // Trouver par IDs
  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    return this.prisma.prisma().interests.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, slug: true },
    });
  }

  /** Lien user <-> interests via pivot user_interests */
  async attachToUser(userId: string, addIds: string[] = [], removeIds: string[] = []) {
    const db = this.prisma.prisma();

    if (!isUuid(userId)) throw new BadRequestException('Invalid userId (UUID required)');
    const badAdd = addIds.filter(id => !isUuid(id));
    const badRem = removeIds.filter(id => !isUuid(id));
    if (badAdd.length || badRem.length) {
      throw new BadRequestException(`Invalid interest UUID(s): ${[...badAdd, ...badRem].join(', ')}`);
    }

    if (removeIds.length) {
      await db.user_interests.deleteMany({ where: { user_id: userId, interest_id: { in: removeIds } } });
    }
    if (addIds.length) {
      await db.user_interests.createMany({
        data: addIds.map(interest_id => ({ user_id: userId, interest_id })),
        skipDuplicates: true,
      });
    }
    return true;
  }

  // Liste des intérêts par utilisateur
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

  // Ajout d'un embedding interet
  async setInterestEmbedding(interestId: string, vec: number[], dim = 1536) {
    const lit = toVectorLiteral(vec, dim);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE interests SET embedding = '${lit}'::vector WHERE id = $1`,
      interestId,
    );
    return true;
  }

  // Recherche d'intérêts par embedding
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

  /** Admin: set par slugs (insensible à la casse côté CITEXT). Les slugs inconnus sont ignorés. */
  async setBySlugs(userId: string, addSlugs: string[] = [], removeSlugs: string[] = []) {
    const db = this.prisma.prisma();
    if (!isUuid(userId)) throw new BadRequestException('Invalid userId (UUID required)');

    const [add, rem] = await Promise.all([
      addSlugs.length
        ? db.interests.findMany({ where: { slug: { in: addSlugs } }, select: { id: true } })
        : Promise.resolve([] as { id: string }[]),
      removeSlugs.length
        ? db.interests.findMany({ where: { slug: { in: removeSlugs } }, select: { id: true } })
        : Promise.resolve([] as { id: string }[]),
    ]);

    return this.attachToUser(
      userId,
      add.map(s => s.id),
      rem.map(s => s.id),
    );
  }
}
