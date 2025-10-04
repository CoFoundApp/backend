import { Injectable, NotFoundException, ForbiddenException, Inject, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import {
  mapProjectStatusToPrisma,
  mapProjectStageToPrisma,
  mapVisibilityToPrisma,
  mapProjectStatusFromPrisma,
  mapProjectStageFromPrisma,
  mapVisibilityFromPrisma,
} from '../../common/enums/enum-mapper';
import { ProfileVisibility } from '../../common/enums/domain.enums';

import { EMBEDDING_PORT, EmbeddingPort } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { ProjectListFiltersInput, ProjectListPageInput, ProjectListResult, ProjectListSortBy, ProjectListSortInput } from './dto/project-list.input';
import { Project as GqlProject } from './project.type';

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  description: string | null;
  industry: string | null;
  tags: string[] | null;
  status: any;
  stage: any;
  visibility: any;
  attachment_urls: string[] | null;
  banner_url: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  project_skills?: Array<{
    skill_id: string;
    skills?: { slug?: string | null; name?: string | null } | null;
  }>;
  project_interests?: Array<{
    interest_id: string;
    interests?: { slug?: string | null; name?: string | null } | null;
  }>;
};

export function mapProjectRowToGql(row: ProjectRow): GqlProject {
  const skills: string[] = (row.project_skills ?? [])
    .map(ps => ps.skills?.slug ?? ps.skills?.name ?? ps.skill_id)
    .filter(Boolean) as string[];

  const interests: string[] = (row.project_interests ?? [])
    .map(pi => pi.interests?.slug ?? pi.interests?.name ?? pi.interest_id)
    .filter(Boolean) as string[];

  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    summary: row.summary ?? null,
    description: row.description ?? null,
    industry: row.industry ?? null,
    tags: row.tags ?? [],
    status: mapProjectStatusFromPrisma(row.status),
    stage: mapProjectStageFromPrisma(row.stage),
    visibility: mapVisibilityFromPrisma(row.visibility),
    attachment_urls: row.attachment_urls ?? [],
    banner_url: row.banner_url ?? null,
    avatar_url: row.avatar_url ?? null,
    project_skills: skills,
    project_interests: interests,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

@Injectable()
export class ProjectService implements OnModuleDestroy{
  private searchClient: PrismaClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
    private readonly mail: TemplateMailerService,
) {}

  private getSearchClient(): PrismaClient {
    if (!this.searchClient) {
      this.searchClient = new PrismaClient({
        log: ['error'],
      });
    }
    return this.searchClient;
  }

  async onModuleDestroy() {
    if (this.searchClient) {
      await this.searchClient.$disconnect();
    }
  }

  private async safeSend(to: string | null | undefined, template: string, payload: Record<string, any>) {
    if (!to) return;
    try { await this.mail.sendTemplate(to, template, 'en', payload); } catch {}
  }

  private slugToName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /** Résoudre et créer automatiquement les skills manquants */
  private async resolveOrCreateSkillSlugs(
    slugs: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    if (!slugs?.length) return [];

    const client = (tx ?? this.prisma.prisma()) as Prisma.TransactionClient;
    const createdIds: string[] = [];

    for (const slug of slugs) {
      try {
        let skill = await client.skills.findUnique({
          where: { slug },
          select: { id: true }
        });

        if (!skill) {
          try {
            skill = await client.skills.create({
              data: {
                name: this.slugToName(slug),
                slug: slug,
                category: 'Auto-generated'
              },
              select: { id: true }
            });
          } catch (createError: any) {
            if (createError?.code === 'P2002') {
              skill = await client.skills.findUnique({
                where: { slug },
                select: { id: true }
              });
            }

            if (!skill) {
              console.warn(`❌ Failed to create or find skill "${slug}":`, createError);
              continue;
            }
          }
        }

        if (skill) {
          createdIds.push(skill.id);
        }

      } catch (error) {
        console.warn(`❌ Error processing skill "${slug}":`, error);
        continue;
      }
    }

    return createdIds;
  }

  /** Même logique pour les interests */
  private async resolveOrCreateInterestSlugs(
    slugs: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    if (!slugs?.length) return [];

    const client = (tx ?? this.prisma.prisma()) as Prisma.TransactionClient;
    const createdIds: string[] = [];

    for (const slug of slugs) {
      try {
        let interest = await client.interests.findUnique({
          where: { slug },
          select: { id: true }
        });

        if (!interest) {
          try {
            interest = await client.interests.create({
              data: {
                name: this.slugToName(slug),
                slug: slug,
                category: 'Auto-generated'
              },
              select: { id: true }
            });
          } catch (createError: any) {
            if (createError?.code === 'P2002') {
              interest = await client.interests.findUnique({
                where: { slug },
                select: { id: true }
              });
            }

            if (!interest) {
              console.warn(`❌ Failed to create or find interest "${slug}":`, createError);
              continue;
            }
          }
        }

        if (interest) {
          createdIds.push(interest.id);
        }

      } catch (error) {
        console.warn(`❌ Error processing interest "${slug}":`, error);
        continue;
      }
    }

    return createdIds;
  }

  async create(ownerId: string, input: CreateProjectInput) {
    try {
      let skillIds: string[] = [];
      let interestIds: string[] = [];

      if (input.project_skills && input.project_skills.length > 0) {
        const skillSlugs = input.project_skills.filter(Boolean);
        skillIds = await this.resolveOrCreateSkillSlugs(skillSlugs);
      }

      if (input.project_interests && input.project_interests.length > 0) {
        const interestSlugs = input.project_interests.filter(Boolean);
        interestIds = await this.resolveOrCreateInterestSlugs(interestSlugs);
      }

      const project = await this.prisma.prisma().projects.create({
        data: {
          owner_id: ownerId,
          title: input.title,
          summary: input.summary ?? null,
          description: input.description ?? null,
          industry: input.industry ?? null,
          tags: input.tags || [],
          status: input.status ? mapProjectStatusToPrisma(input.status) : undefined,
          stage: input.stage ? mapProjectStageToPrisma(input.stage) : undefined,
          visibility: input.visibility ? mapVisibilityToPrisma(input.visibility as ProfileVisibility) : undefined,
          attachment_urls: input.attachment_urls || [],
          banner_url: input.banner_url,
          avatar_url: input.avatar_url,
        }
      });

      if (skillIds.length > 0) {
        await this.prisma.prisma().project_skills.createMany({
          data: skillIds.map(skill_id => ({
            project_id: project.id,
            skill_id
          })),
          skipDuplicates: true
        });
      }

      if (interestIds.length > 0) {
        await this.prisma.prisma().project_interests.createMany({
          data: interestIds.map(interest_id => ({
            project_id: project.id,
            interest_id
          })),
          skipDuplicates: true
        });
      }

      await this.prisma.prisma().project_members.create({
        data: {
          project_id: project.id,
          user_id: ownerId,
          role: 'owner',
          status: 'active',
        }
      });

      try {
        const owner = await this.prisma.prisma().users.findUnique({
          where: { id: ownerId },
          select: { email: true, profiles: { select: { display_name: true } } },
        });

        if (owner?.email) {
          await this.safeSend(owner.email, 'owner_project_created', {
            app_name: process.env.APP_NAME,
            project_title: input.title,
            cta_url: `${process.env.APP_BASE_URL}/projects/${project.id}`,
          });
        }
      } catch (emailError) {
        console.warn('Failed to send project creation email:', emailError);
      }

    const result = {
      id: project.id,
      owner_id: project.owner_id,
      title: project.title,
      summary: project.summary,
      description: project.description,
      industry: project.industry,
      tags: project.tags || [],
      status: mapProjectStatusFromPrisma(project.status),
      stage: mapProjectStageFromPrisma(project.stage),
      visibility: mapVisibilityFromPrisma(project.visibility),
      attachment_urls: project.attachment_urls || [],
      banner_url: project.banner_url,
      avatar_url: project.avatar_url,
      project_skills: input.project_skills?.filter(Boolean) || [],
      project_interests: input.project_interests?.filter(Boolean) || [],
      created_at: project.created_at,
      updated_at: project.updated_at,
    };

    return result;

  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  }

  async findById(id: string): Promise<ProjectRow | null> {
    return this.prisma.prisma().projects.findUnique({
      where: { id },
      include: {
        project_skills: {
          include: {
            skills: {
              select: { slug: true, name: true }
            }
          }
        },
        project_interests: {
          include: {
            interests: {
              select: { slug: true, name: true }
            }
          }
        }
      }
    }) as Promise<ProjectRow | null>;
  }

  async listByOwnerOrMember(userId: string): Promise<ProjectRow[]> {
    return this.prisma.prisma().projects.findMany({
      where: {
        OR: [
          { owner_id: userId },
          { project_members: { some: { user_id: userId, status: 'active' } } },
        ],
      },
      include: {
        project_skills: {
          include: {
            skills: {
              select: { slug: true, name: true },
            },
          },
        },
        project_interests: {
          include: {
            interests: {
              select: { slug: true, name: true },
            },
          },
        },
      },
    }) as Promise<ProjectRow[]>;
  }

  private async executeProjectUpdate(
    tx: Prisma.TransactionClient,
    id: string,
    input: UpdateProjectInput,
  ) {
    const updated = await tx.projects.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        summary: input.summary ?? undefined,
        description: input.description ?? undefined,
        industry: input.industry ?? undefined,
        tags: Array.isArray(input.tags) ? input.tags : undefined,
        status: input.status ? mapProjectStatusToPrisma(input.status) : undefined,
        stage: input.stage ? mapProjectStageToPrisma(input.stage) : undefined,
        visibility: input.visibility ? mapVisibilityToPrisma(input.visibility as ProfileVisibility) : undefined,
        attachment_urls: Array.isArray(input.attachment_urls) ? input.attachment_urls : undefined,
        banner_url: input.banner_url ?? undefined,
        avatar_url: input.avatar_url ?? undefined,
        updated_at: new Date(),
      }
    });

    if (input.project_skills !== undefined) {
      await tx.project_skills.deleteMany({ where: { project_id: id } });

      if (input.project_skills && input.project_skills.length > 0) {
        const skillSlugs = input.project_skills.filter(Boolean);
        if (skillSlugs.length > 0) {
          const skillIds = await this.resolveOrCreateSkillSlugs(skillSlugs, tx);
          if (skillIds.length) {
            await tx.project_skills.createMany({
              data: skillIds.map(skill_id => ({
                project_id: id,
                skill_id
              }))
            });
          }
        }
      }
    }

    if (input.project_interests !== undefined) {
      await tx.project_interests.deleteMany({ where: { project_id: id } });

      if (input.project_interests && input.project_interests.length > 0) {
        const interestSlugs = input.project_interests.filter(Boolean);
        if (interestSlugs.length > 0) {
          const interestIds = await this.resolveOrCreateInterestSlugs(interestSlugs, tx);
          if (interestIds.length) {
            await tx.project_interests.createMany({
              data: interestIds.map(interest_id => ({
                project_id: id,
                interest_id
              }))
            });
          }
        }
      }
    }

    return updated;
  }

  private isPrismaClientWithTransaction(
    client: Prisma.TransactionClient | PrismaService,
  ): client is PrismaService {
    return typeof (client as PrismaService).$transaction === 'function';
  }

  async update(id: string, ownerId: string, input: UpdateProjectInput) {
    const client = this.prisma.prisma();
    const existing = await client.projects.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    if (this.isPrismaClientWithTransaction(client)) {
      return client.$transaction(tx => this.executeProjectUpdate(tx, id, input));
    }

    return this.executeProjectUpdate(client, id, input);
  }

  async delete(id: string, ownerId: string) {
    const existing = await this.prisma.prisma().projects.findUnique({
      where: { id }, select: { owner_id: true, title: true },
    });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    const [owner, memberIds] = await Promise.all([
      this.prisma.prisma().users.findUnique({
        where: { id: ownerId }, select: { email: true },
      }),
      this.prisma.prisma().project_members.findMany({
        where: { project_id: id, status: 'active' }, select: { user_id: true },
      }),
    ]);

    await this.safeSend(owner?.email, 'owner_project_deleted', {
      app_name: process.env.APP_NAME,
      project_title: existing.title,
    });

    if (memberIds.length) {
      const users = await this.prisma.prisma().users.findMany({
        where: { id: { in: memberIds.map(m => m.user_id).filter(uid => uid !== ownerId) } },
        select: { email: true },
      });
      for (const u of users) {
        await this.safeSend(u.email, 'member_project_deleted', {
          app_name: process.env.APP_NAME,
          project_title: existing.title,
        });
      }
    }

    await this.prisma.prisma().projects.delete({ where: { id } });
    return true;
  }

  async searchProjects(q: string, embedding?: number[], k = 20) {
    const query = (q ?? '').trim();
    if (!query) return [];

    const EMBEDDING_DIM = 1024;
    const PRESELECT_FACTOR = 2;
    const EF_SEARCH = 100;
    const VECTOR_DISTANCE_THRESHOLD = 1.2;
    const MIN_QUALITY_THRESHOLD = 0.2;

    let vec = Array.isArray(embedding) && embedding.length === EMBEDDING_DIM ? embedding : undefined;
    if (!vec || vec.length !== EMBEDDING_DIM) {
      try {
        vec = await this.embedder.embedText(query);
      } catch (embeddingError) {
        console.warn('🚨 Embedding service failed, using BM25 + skills only:', (embeddingError as Error).message);
        vec = undefined;
      }
    }

    const hasVec = Array.isArray(vec) && vec.length === EMBEDDING_DIM;
    const prelimit = Math.max(1, k * PRESELECT_FACTOR);

    const client = this.getSearchClient();

    try {
      if (EF_SEARCH && Number.isInteger(EF_SEARCH) && EF_SEARCH > 0) {
        try {
          await client.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${EF_SEARCH}`);
        } catch (error) {
          console.warn('Could not set hnsw.ef_search:', error);
        }
      }

      // Recherche BM25 et Vector en parallèle
      const searchPromises = [
        client.$queryRawUnsafe(
          `
          WITH q AS (SELECT websearch_to_tsquery('simple', $1) AS query)
          SELECT
            p.id, p.owner_id, p.title, p.summary, p.description,
            p.industry, p.tags, p.status, p.stage, p.visibility,
            p.attachment_urls, p.banner_url, p.avatar_url,
            p.created_at, p.updated_at,
            ts_rank_cd(p.search_tsv, q.query, 32) AS bm25
          FROM projects p, q
          WHERE p.visibility IN ('public','unlisted')
            AND q.query <> ''::tsquery
            AND q.query @@ p.search_tsv
          ORDER BY bm25 DESC
          LIMIT $2::int
          `,
          query,
          prelimit,
        ) as Promise<Array<any>>,

        // Vector search conditionnel
        hasVec && vec ? client.$queryRawUnsafe(
          `
          SELECT
            p.id, p.owner_id, p.title, p.summary, p.description,
            p.industry, p.tags, p.status, p.stage, p.visibility,
            p.attachment_urls, p.banner_url, p.avatar_url,
            p.created_at, p.updated_at,
            (p.embedding <=> $1::halfvec) AS distance
          FROM projects p
          WHERE p.visibility IN ('public','unlisted')
            AND p.embedding IS NOT NULL
          ORDER BY p.embedding <=> $1::halfvec
          LIMIT $2::int
          `,
          toVectorLiteral(vec, EMBEDDING_DIM),
          prelimit,
        ) as Promise<Array<any>> : Promise.resolve([])
      ];

      const [bm25Rows, vectorRows] = await Promise.all(searchPromises);


      // Combiner les résultats
      const map = new Map<string, any>();

      for (const r of bm25Rows) {
        map.set(r.id, {
          project: r,
          bm25: r.bm25 as number,
          distance: undefined
        });
      }

      for (const r of vectorRows) {
        if (typeof r.distance !== 'number' || r.distance > VECTOR_DISTANCE_THRESHOLD) {
          continue;
        }

        const existing = map.get(r.id);
        if (existing) {
          existing.distance = r.distance as number;
        } else {
          map.set(r.id, {
            project: r,
            bm25: 0,
            distance: r.distance as number
          });
        }
      }

      // Si pas de résultats BM25/vector, chercher par skills direct
      if (map.size === 0) {

        const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

        // Recherche par skills
        const skillMatches = await client.$queryRawUnsafe(`
          SELECT DISTINCT p.id, p.owner_id, p.title, p.summary, p.description,
                p.industry, p.tags, p.status, p.stage, p.visibility,
                p.attachment_urls, p.banner_url, p.avatar_url,
                p.created_at, p.updated_at,
                0 as bm25
          FROM projects p
          JOIN project_skills ps ON p.id = ps.project_id
          JOIN skills s ON s.id = ps.skill_id
          WHERE (${tokens.map((_, i) => `s.slug ILIKE $${i + 1}`).join(' OR ')})
            AND p.visibility IN ('public','unlisted')
          LIMIT $${tokens.length + 1}::int
        `, ...tokens.map(token => `%${token}%`), prelimit) as Array<any>;

        // Recherche par interests
        const interestMatches = await client.$queryRawUnsafe(`
          SELECT DISTINCT p.id, p.owner_id, p.title, p.summary, p.description,
                p.industry, p.tags, p.status, p.stage, p.visibility,
                p.attachment_urls, p.banner_url, p.avatar_url,
                p.created_at, p.updated_at,
                0 as bm25
          FROM projects p
          JOIN project_interests pi ON p.id = pi.project_id
          JOIN interests i ON i.id = pi.interest_id
          WHERE (${tokens.map((_, i) => `i.slug ILIKE $${i + 1}`).join(' OR ')})
            AND p.visibility IN ('public','unlisted')
          LIMIT $${tokens.length + 1}::int
        `, ...tokens.map(token => `%${token}%`), prelimit) as Array<any>;

        // Ajouter les résultats skills
        for (const r of skillMatches) {
          if (!map.has(r.id)) {
            map.set(r.id, {
              project: r,
              bm25: 0.1,
              distance: undefined
            });
          }
        }

        // Ajouter les résultats interests
        for (const r of interestMatches) {
          if (!map.has(r.id)) {
            map.set(r.id, {
              project: r,
              bm25: 0.05,
              distance: undefined
            });
          }
        }
      }

      if (map.size === 0) {
        console.log(`❌ No results found for "${query}"`);
        return [];
      }

      // Récupérer les relations avec timeout protection
      const projectIds = Array.from(map.keys());
      const skillsByProject: Record<string, string[]> = {};
      const interestsByProject: Record<string, string[]> = {};

      if (projectIds.length > 0) {
        try {

          const relationsPromise = Promise.all([
            client.$queryRawUnsafe(
              `
              SELECT ps.project_id, s.slug as skill_slug
              FROM project_skills ps
              JOIN skills s ON s.id = ps.skill_id
              WHERE ps.project_id = ANY($1::uuid[])
              ORDER BY s.name
              `,
              projectIds
            ) as Promise<Array<{project_id: string; skill_slug: string}>>,

            client.$queryRawUnsafe(
              `
              SELECT pi.project_id, i.slug as interest_slug
              FROM project_interests pi
              JOIN interests i ON i.id = pi.interest_id
              WHERE pi.project_id = ANY($1::uuid[])
              ORDER BY i.name
              `,
              projectIds
            ) as Promise<Array<{project_id: string; interest_slug: string}>>
          ]);

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Relations timeout')), 3000)
          );

          const [skillsRows, interestsRows] = await Promise.race([
            relationsPromise,
            timeoutPromise
          ]);

          // Construire les maps
          for (const row of skillsRows) {
            if (!skillsByProject[row.project_id]) skillsByProject[row.project_id] = [];
            skillsByProject[row.project_id].push(row.skill_slug);
          }

          for (const row of interestsRows) {
            if (!interestsByProject[row.project_id]) interestsByProject[row.project_id] = [];
            interestsByProject[row.project_id].push(row.interest_slug);
          }


        } catch (error) {
          console.warn('Relations query failed, using empty relations:', error);
        }
      }

      // SCORING INTELLIGENT
      const bm25Max = Math.max(0, ...Array.from(map.values()).map(v => v.bm25));
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

      const results: Array<{ project: any; score: number; reasons: string[] }> = [];

      for (const { project, bm25, distance } of map.values()) {
        const bm25Norm = bm25Max > 0 ? bm25 / bm25Max : 0;
        const cosine = typeof distance === 'number' ? Math.max(0, 1 - distance) : 0;

        const projectSkills = skillsByProject[project.id] || [];
        const projectInterests = interestsByProject[project.id] || [];

        let skillMatches = 0;
        let tagMatches = 0;
        let titleMatches = 0;
        let descriptionMatches = 0;
        let interestMatches = 0;

        const title = project.title?.toLowerCase() ?? '';
        const summary = project.summary?.toLowerCase() ?? '';
        const description = project.description?.toLowerCase() ?? '';

        for (const token of tokens) {
          if (title.includes(token)) titleMatches++;

          if (summary.includes(token) || description.includes(token)) descriptionMatches++;

          if (projectSkills.some(skill => skill.toLowerCase().includes(token))) {
            skillMatches++;
          }

          if (Array.isArray(project.tags) &&
              project.tags.some((tag: string) => tag.toLowerCase().includes(token))) {
            tagMatches++;
          }

          if (projectInterests.some(interest => interest.toLowerCase().includes(token))) {
            interestMatches++;
          }
        }

        // SCORING ADAPTATIF INTELLIGENT
        let finalScore = 0;

        if (bm25Norm > 0) {
          const bm25Power = 0.35 + Math.min(0.25, bm25Norm * 0.5);
          finalScore += bm25Norm * bm25Power;
        }

        if (cosine > 0.6) {
          const cosinePower = bm25Norm < 0.3 ? 0.4 : 0.25;
          finalScore += Math.pow(cosine, 0.8) * cosinePower;
        }

        if (skillMatches > 0) {
          const skillScore = Math.min(0.4, skillMatches * 0.15);
          finalScore += skillScore;
        }

        if (titleMatches > 0) {
          const titleScore = Math.min(0.25, titleMatches * 0.15);
          finalScore += titleScore;
        }

        if (tagMatches > 0) {
          const tagScore = Math.min(0.2, tagMatches * 0.1);
          finalScore += tagScore;
        }

        if (interestMatches > 0) {
          const interestScore = Math.min(0.15, interestMatches * 0.08);
          finalScore += interestScore;
        }

        if (descriptionMatches > 0) {
          const descScore = Math.min(0.1, descriptionMatches * 0.05);
          finalScore += descScore;
        }

        let qualityBonus = 1.0;

        if (project.summary && project.summary.length > 50) qualityBonus += 0.05;
        if (project.description && project.description.length > 100) qualityBonus += 0.05;

        if (projectSkills.length > 3) qualityBonus += 0.05;
        if (projectInterests.length > 2) qualityBonus += 0.05;

        const daysSinceCreation = (new Date().getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) qualityBonus += 0.05;

        finalScore *= qualityBonus;
        finalScore = Math.min(1.0, finalScore);

        const adaptiveThreshold = bm25Norm > 0 || cosine > 0 ? MIN_QUALITY_THRESHOLD : 0.1;
        if (finalScore < adaptiveThreshold) {
          continue;
        }

        const reasons: string[] = [];

        if (titleMatches > 0) {
          reasons.push(`Match titre (${titleMatches} mots)`);
        }
        if (skillMatches > 0) {
          reasons.push(`Compétences pertinentes (${skillMatches})`);
        }
        if (tagMatches > 0) {
          reasons.push(`Tags pertinents (${tagMatches})`);
        }
        if (interestMatches > 0) {
          reasons.push(`Centres d'intérêt (${interestMatches})`);
        }
        if (descriptionMatches > 0) {
          reasons.push('Match description');
        }
        if (cosine > 0.75) {
          reasons.push('Forte similarité sémantique');
        } else if (cosine > 0.6) {
          reasons.push('Similarité sémantique');
        }

        if (!reasons.length) {
          reasons.push('Pertinence générale');
        }

        results.push({
          project: {
            ...project,
            project_skills: projectSkills,
            project_interests: projectInterests,
          },
          score: Math.round(finalScore * 1000) / 1000,
          reasons
        });
      }

      results.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) < 0.01) {
          const aSkills = a.project.project_skills?.length || 0;
          const bSkills = b.project.project_skills?.length || 0;
          if (aSkills !== bSkills) return bSkills - aSkills;

          return new Date(b.project.updated_at).getTime() - new Date(a.project.updated_at).getTime();
        }
        return scoreDiff;
      });

      return results.slice(0, k);

    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  async listProjects(
    filters?: ProjectListFiltersInput,
    sort?: ProjectListSortInput,
    page?: ProjectListPageInput,
  ): Promise<ProjectListResult> {
    const pg = {
      page: Math.max(1, page?.page ?? 1),
      pageSize: Math.min(100, Math.max(1, page?.pageSize ?? 20)),
    };
    const skip = (pg.page - 1) * pg.pageSize;
    const take = pg.pageSize;

    const where: any = {};

    if (filters?.stages?.length) {
      where.stage = { in: filters.stages.map(s => mapProjectStageToPrisma(s)) };
    }
    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses.map(s => mapProjectStatusToPrisma(s)) };
    }
    if (filters?.createdFrom || filters?.createdTo) {
      where.created_at = {};
      if (filters.createdFrom) where.created_at.gte = filters.createdFrom;
      if (filters.createdTo) where.created_at.lt = filters.createdTo;
    }
    if (filters?.updatedFrom || filters?.updatedTo) {
      where.updated_at = {};
      if (filters.updatedFrom) where.updated_at.gte = filters.updatedFrom;
      if (filters.updatedTo) where.updated_at.lt = filters.updatedTo;
    }

    let orderBy: any = { created_at: 'desc' as const };
    if (sort) {
      if (sort.by === ProjectListSortBy.CREATED_AT) orderBy = { created_at: sort.direction };
      else if (sort.by === ProjectListSortBy.UPDATED_AT) orderBy = { updated_at: sort.direction };
      else if (sort.by === ProjectListSortBy.TITLE) orderBy = { title: sort.direction };
    }

    const [total, rows] = await Promise.all([
      this.prisma.prisma().projects.count({ where }),
      this.prisma.prisma().projects.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          project_skills: {
            select: {
              skill_id: true,
              skills: { select: { slug: true, name: true } },
            },
          },
          project_interests: {
            select: {
              interest_id: true,
              interests: { select: { slug: true, name: true } },
            },
          },
        },
      }),
    ]);

    const items = rows.map(mapProjectRowToGql);
    return { items, total, page: pg.page, pageSize: pg.pageSize };
  }
}
