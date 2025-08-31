import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateSkillInput } from './dto/create-skill.input';
import { slugify } from '../../common/utils/slug.util';
import { ListArgs } from './dto/list.args';
import { makeCursorPage } from '../../common/utils/pagination.util';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { isUuid } from '../../common/utils/uuid.util';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin create skill
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

  // Admin list skills
  async adminListSkills(args: ListArgs) {
    return this.listSkills(args);
  }

  // Liste des compétences
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

  // Trouver par IDs
  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    return this.prisma.prisma().skills.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, slug: true },
    });
  }

  /** Lien user <-> skills via pivot user_skills */
  async attachToUser(userId: string, addIds: string[] = [], removeIds: string[] = []) {
    const db = this.prisma.prisma();

    if (!isUuid(userId)) throw new BadRequestException('Invalid userId (UUID required)');
    const badAdd = addIds.filter(id => !isUuid(id));
    const badRem = removeIds.filter(id => !isUuid(id));
    if (badAdd.length || badRem.length) {
      throw new BadRequestException(`Invalid skill UUID(s): ${[...badAdd, ...badRem].join(', ')}`);
    }

    if (removeIds.length) {
      await db.user_skills.deleteMany({ where: { user_id: userId, skill_id: { in: removeIds } } });
    }
    if (addIds.length) {
      await db.user_skills.createMany({
        data: addIds.map(skill_id => ({ user_id: userId, skill_id })),
        skipDuplicates: true,
      });
    }
    return true;
  }

  // Liste des compétences par utilisateur
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

  // Recherche de compétences par embedding
  async searchSkillsByEmbedding(vec: number[], limit = 10, dim = 1536) {
    const lit = toVectorLiteral(vec, dim);

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

  /** Admin: set par slugs (insensible à la casse côté CITEXT). Les slugs inconnus sont ignorés. */
  async setBySlugs(userId: string, addSlugs: string[] = [], removeSlugs: string[] = []) {
    const db = this.prisma.prisma();
    if (!isUuid(userId)) throw new BadRequestException('Invalid userId (UUID required)');

    const [add, rem] = await Promise.all([
      addSlugs.length
        ? db.skills.findMany({ where: { slug: { in: addSlugs } }, select: { id: true } })
        : Promise.resolve([] as { id: string }[]),
      removeSlugs.length
        ? db.skills.findMany({ where: { slug: { in: removeSlugs } }, select: { id: true } })
        : Promise.resolve([] as { id: string }[]),
    ]);

    return this.attachToUser(
      userId,
      add.map(s => s.id),
      rem.map(s => s.id),
    );
  }

  /** Remplace la liste des compétences d'un utilisateur par l'ensemble fourni */
  async setForUser(userId: string, skillIds: string[] = []) {
    const db = this.prisma.prisma();

    // Récupérer les compétences déjà associées
    const rows = await db.user_skills.findMany({
      where: { user_id: userId },
      select: { skill_id: true },
    });
    const existing = rows.map(r => r.skill_id);

    // Calculer les ajouts et suppressions
    const toAdd = skillIds.filter(id => !existing.includes(id));
    const toRemove = existing.filter(id => !skillIds.includes(id));

    if (toAdd.length || toRemove.length) {
      await this.attachToUser(userId, toAdd, toRemove);
    }
    return true;
  }
}
