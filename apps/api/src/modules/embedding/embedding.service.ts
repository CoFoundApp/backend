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
      `UPDATE skills SET embedding = '${lit}'::halfvec WHERE id = $1::uuid`,
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
      `UPDATE interests SET embedding = '${lit}'::halfvec WHERE id = $1::uuid`,
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
      SELECT id, name, category, slug, (embedding <=> '${lit}'::halfvec) AS distance
      FROM skills
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::halfvec
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
      SELECT id, name, category, slug, (embedding <=> '${lit}'::halfvec) AS distance
      FROM interests
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '${lit}'::halfvec
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
        culture_work_styles: true,
        culture_values: true,
        preferred_team_role: true,
        preferred_team_size: true,
        management_style: true,
        environment: true,
        collaboration_mode: true,
        communication_style: true,
        communication_frequency: true,
        project_members: {
          select: {
            role: true,
            status: true,
          },
        },
        timezone: true,
        required_hours_min: true,
        required_hours_max: true,
        critical_time_slots: true,
        remote_ratio_min: true,
        remote_ratio_max: true,
        duration_weeks_min: true,
        duration_weeks_max: true,
        urgency: true,
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
    if (p.culture_work_styles?.length) parts.push(`work_styles: ${p.culture_work_styles.join(', ')}`);
    if (p.culture_values?.length) parts.push(`values: ${p.culture_values.join(', ')}`);
    if (p.preferred_team_role) parts.push(`team_role: ${p.preferred_team_role}`);
    if (p.preferred_team_size) parts.push(`team_size: ${p.preferred_team_size}`);
    if (p.management_style) parts.push(`management: ${p.management_style}`);
    if (p.environment) parts.push(`environment: ${p.environment}`);
    if (p.collaboration_mode) parts.push(`collaboration: ${p.collaboration_mode}`);
    if (p.communication_style) parts.push(`communication_style: ${p.communication_style}`);
    if (p.communication_frequency) parts.push(`communication_frequency: ${p.communication_frequency}`);
    const activeMembers = (p.project_members ?? []).filter((member: any) => member.status === 'active');
    if (activeMembers.length) {
      parts.push(`team_roles: ${activeMembers.map((member: any) => member.role).filter(Boolean).join(', ')}`);
    }
    if (p.timezone) parts.push(`timezone: ${p.timezone}`);
    if (typeof p.required_hours_min === 'number' || typeof p.required_hours_max === 'number') {
      parts.push(`hours: ${p.required_hours_min ?? '?'}-${p.required_hours_max ?? '?'} per_week`);
    }
    if (p.critical_time_slots) {
      const slots = Array.isArray(p.critical_time_slots)
        ? p.critical_time_slots.map((slot: any) => JSON.stringify(slot)).join(' | ')
        : JSON.stringify(p.critical_time_slots);
      if (slots) parts.push(`critical_slots: ${slots}`);
    }
    if (typeof p.remote_ratio_min === 'number' || typeof p.remote_ratio_max === 'number') {
      parts.push(`remote_ratio: ${p.remote_ratio_min ?? '?'}-${p.remote_ratio_max ?? '?'}%`);
    }
    if (typeof p.duration_weeks_min === 'number' || typeof p.duration_weeks_max === 'number') {
      parts.push(`duration: ${p.duration_weeks_min ?? '?'}-${p.duration_weeks_max ?? '?'} weeks`);
    }
    if (p.urgency) parts.push(`urgency: ${p.urgency}`);
    const vec = await this.embedder.embedText(parts.join(' | '));
    if (!vec.length) return false;
    const lit = toVectorLiteral(vec, EMBEDDING_DIM);
    await this.prisma.prisma().$executeRawUnsafe(
      `UPDATE projects SET embedding = '${lit}'::halfvec WHERE id = $1::uuid`,
      projectId,
    );
    return true;
  }
}
