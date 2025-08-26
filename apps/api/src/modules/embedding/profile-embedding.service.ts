import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT, EmbeddingPort, EMBEDDING_DIM } from './embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';

@Injectable()
export class ProfileEmbeddingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
  ) {}

  // Recalculer l'embedding pour un utilisateur donné
  async recomputeForUser(userId: string) {
    const profile = await this.prisma.prisma().profiles.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!profile) return false;

    const skills = await this.prisma.prisma().$queryRawUnsafe<{ name: string }[]>(
      `
      SELECT s.name
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = $1::uuid
      ORDER BY s.name ASC
      `,
      userId,
    );
    const interests = await this.prisma.prisma().$queryRawUnsafe<{ name: string }[]>(
      `
      SELECT i.name
      FROM user_interests ui
      JOIN interests i ON i.id = ui.interest_id
      WHERE ui.user_id = $1::uuid
      ORDER BY i.name ASC
      `,
      userId,
    );

    const summary = [
      (skills ?? []).length ? `skills: ${(skills ?? []).map(x => x.name).join(', ')}` : '',
      (interests ?? []).length ? `interests: ${(interests ?? []).map(x => x.name).join(', ')}` : '',
    ].filter(Boolean).join(' | ') || 'empty profile';

    const vec = await this.embedder.embedText(summary);
    if (!vec.length) return false;

    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE profiles SET embedding = '${lit}'::vector WHERE id = $1::uuid`,
      profile.id,
    );
    return true;
  }
}
