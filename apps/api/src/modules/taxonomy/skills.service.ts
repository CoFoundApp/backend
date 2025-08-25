import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateSkillInput } from './dto/create-skill.input';
import { slugify } from '../../common/utils/slug.util';
import { ListArgs } from './dto/list.args';
import { makeCursorPage } from '../../common/utils/pagination.util';
import type { Prisma, PrismaClient } from '@prisma/client';
import { toVectorLiteral } from '../../common/utils/vector.util';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreateSkill(input: CreateSkillInput) {
    const name = input.name.trim();
    const slug = slugify(name);

    try {
      return await this.prisma.prisma().skills.create({
        data: { name, category: input.category ?? null, slug },
        select: { id: true, name: true, category: true, slug: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Skill with same name or slug already exists');
      throw e;
    }
  }

  async adminListSkills(args: ListArgs) {
    return this.listSkills(args);
  }

  async listSkills({ q, category, limit, cursor }: ListArgs) {
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

    const items = await this.prisma.prisma().skills.findMany({
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
    return this.prisma.prisma().skills.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, slug: true },
    });
  }

  /** Lien user <-> skills via pivot user_skills */
  async attachToUser(userId: string, addIds: string[] = [], removeIds: string[] = []) {
    const prisma = this.prisma.prisma();
    const ops: Prisma.PrismaPromise<any>[] = [];

    if (addIds.length) {
      ops.push(
        prisma.user_skills.createMany({
          data: addIds.map((skill_id) => ({ user_id: userId, skill_id })),
          skipDuplicates: true,
        })
      );
    }
    if (removeIds.length) {
      ops.push(
        prisma.user_skills.deleteMany({
          where: { user_id: userId, skill_id: { in: removeIds } },
        })
      );
    }
    if (!ops.length) return true;

    await (prisma as unknown as PrismaClient).$transaction(ops);
    return true;
  }

  async listByUser(userId: string) {
    const rows = await this.prisma.prisma().user_skills.findMany({
      where: { user_id: userId },
      include: {
        skills: { select: { id: true, name: true, category: true, slug: true } },
      },
      orderBy: { skills: { name: 'asc' } },
    });
    return rows.map((r) => r.skills);
  }

      /** Met à jour l'embedding d'un skill (par ex. après calcul en worker) */
  async setSkillEmbedding(skillId: string, vec: number[], dim = 1536) {
    const lit = toVectorLiteral(vec, dim);
    // UPDATE via SQL brut (pgvector)
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE skills SET embedding = '${lit}'::vector WHERE id = $1`,
      skillId,
    );
    return true;
  }

  async searchSkillsByEmbedding(vec: number[], limit = 10, dim = 1536) {
    const lit = toVectorLiteral(vec, dim);
    // cosine distance operator: <=> (plus petit = plus proche)
    // On renvoie aussi la distance pour debug/tri client
    return this.prisma.prisma().$queryRawUnsafe<
      Array<{ id: string; name: string; category: string | null; slug: string | null; distance: number }>
    >(
      `
      SELECT id, name, category, slug, (embedding <=> '${lit}'::vector) AS distance
      FROM skills
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::vector
      LIMIT $1
      `,
      limit,
    );
  }
}
