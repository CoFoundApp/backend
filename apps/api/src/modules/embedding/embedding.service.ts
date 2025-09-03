import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_DIM, EMBEDDING_PORT, EmbeddingPort } from './embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
  ) {}

  // Calcul et stockage de l'embedding pour une compétence
  async computeAndStoreForSkill(skillId: string) {
    const s = await this.prisma.prisma().skills.findUnique({
      where: { id: skillId },
      select: { id: true, name: true },
    });
    if (!s) return false;
    const vec = await this.embedder.embedText(s.name);
    if (!vec.length) return false;
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE skills SET embedding = '${lit}'::vector WHERE id = $1::uuid`,
      skillId,
    );
    return true;
  }

  // Calcul et stockage de l'embedding pour un intérêt
  async computeAndStoreForInterest(interestId: string) {
    const it = await this.prisma.prisma().interests.findUnique({
      where: { id: interestId },
      select: { id: true, name: true },
    });
    if (!it) return false;
    const vec = await this.embedder.embedText(it.name);
    if (!vec.length) return false;
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE interests SET embedding = '${lit}'::vector WHERE id = $1::uuid`,
      interestId,
    );
    return true;
  }

  /** Texte → top-K skills proches (semantic search) */
  async searchSkillsByText(text: string, limit = 10) {
    const vec = await this.embedder.embedText(text);
    if (!vec.length) return [];
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    return this.prisma.prisma().$queryRawUnsafe<
      Array<{ id: string; name: string; category: string | null; slug: string | null; distance: number }>
    >(
      `
      SELECT id, name, category, slug, (embedding <=> '${lit}'::vector) AS distance
      FROM skills
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::vector
      LIMIT $1::int
      `,
      limit,
    );
  }

  /** Texte → top-K interests proches */
  async searchInterestsByText(text: string, limit = 10) {
    const vec = await this.embedder.embedText(text);
    if (!vec.length) return [];
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    return this.prisma.prisma().$queryRawUnsafe<
      Array<{ id: string; name: string; category: string | null; slug: string | null; distance: number }>
    >(
      `
      SELECT id, name, category, slug, (embedding <=> '${lit}'::vector) AS distance
      FROM interests
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::vector
      LIMIT $1::int
      `,
      limit,
    );
  }

  async computeAndStoreForProject(projectId: string) {
    const p = await this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        summary: true,
        description: true,
        tags: true,
        project_skills: { select: { skills: { select: { name: true } } } },
        project_interests: { select: { interests: { select: { name: true } } } },
      },
    });
    if (!p) return false;
    const parts: string[] = [p.title];
    if (p.summary) parts.push(p.summary);
    if (p.description) parts.push(p.description);
    if (Array.isArray(p.tags) && p.tags.length) parts.push(p.tags.join(', '));
        if (p.project_skills?.length)
      parts.push(p.project_skills.map((ps: any) => ps.skills.name).join(', '));
    if (p.project_interests?.length)
      parts.push(p.project_interests.map((pi: any) => pi.interests.name).join(', '));
    const vec = await this.embedder.embedText(parts.join(' | '));
    if (!vec.length) return false;
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE projects SET embedding = '${lit}'::vector WHERE id = $1::uuid`,
      projectId,
    );
    return true;
  }
}
