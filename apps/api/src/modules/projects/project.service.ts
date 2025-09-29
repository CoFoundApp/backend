import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
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

import { EMBEDDING_PORT, EmbeddingPort, EMBEDDING_DIM } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { PrismaClient } from '@prisma/client';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { ProjectListFiltersInput, ProjectListPageInput, ProjectListResult, ProjectListSortBy, ProjectListSortInput } from './dto/project-list.input';
import { Project as GqlProject } from './project.type';

const BM25_WEIGHT = 0.6;
const COSINE_WEIGHT = 0.4;
const VECTOR_DISTANCE_THRESHOLD = 0.6;
const PRESELECT_FACTOR = 5;
const EF_SEARCH = 40;

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
    skill?: { slug?: string | null; name?: string | null } | null;
  }>;

  project_interests?: Array<{
    interest_id: string;
    interest?: { slug?: string | null; name?: string | null } | null;
  }>;
};

export function mapProjectRowToGql(row: ProjectRow): GqlProject {
  const skills: string[] = (row.project_skills ?? [])
    .map(ps => ps.skill?.slug ?? ps.skill?.name ?? ps.skill_id)
    .filter(Boolean) as string[];

  const interests: string[] = (row.project_interests ?? [])
    .map(pi => pi.interest?.slug ?? pi.interest?.name ?? pi.interest_id)
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

type DbLike = {
  $executeRawUnsafe: (query: string, ...params: any[]) => Promise<any>;
  $queryRawUnsafe: <T = any>(query: string, ...params: any[]) => Promise<T>;
};
@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
    private readonly mail: TemplateMailerService,
) {}

  private async safeSend(to: string | null | undefined, template: string, payload: Record<string, any>) {
    if (!to) return;
    try { await this.mail.sendTemplate(to, template, 'en', payload); } catch {}
  }

  private async withEfSearch<T>(
    efSearch: number | undefined | null,
    run: (db: DbLike) => Promise<T>,
  ): Promise<T> {
    const client = this.prisma.prisma() as unknown as PrismaClient;
    if (efSearch && Number.isInteger(efSearch) && efSearch > 0) {
      return client.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
        return run(tx as unknown as DbLike);
      });
    }
    return run(client as unknown as DbLike);
  }

  async create(ownerId: string, input: CreateProjectInput) {
    const data: any = {
      owner_id: ownerId,
      title: input.title,
      summary: input.summary ?? null,
      description: input.description ?? null,
      industry: input.industry ?? null,
      tags: Array.isArray(input.tags) ? input.tags : [],
      status: input.status ? mapProjectStatusToPrisma(input.status) : undefined,
      stage: input.stage ? mapProjectStageToPrisma(input.stage) : undefined,
      visibility: input.visibility ? mapVisibilityToPrisma(input.visibility as ProfileVisibility) : undefined,
      project_skills: Array.isArray(input.project_skills) ? input.project_skills : [],
      project_interests: Array.isArray(input.project_interests) ? input.project_interests : [],
      attachment_urls: Array.isArray(input.attachment_urls) ? input.attachment_urls : [],
      banner_url: input.banner_url ?? null,
      avatar_url: input.avatar_url ?? null,
    };

    const project = await this.prisma.prisma().projects.create({ data });
    await this.prisma.prisma().project_members.create({
      data: {
        project_id: project.id,
        user_id: ownerId,
        role: 'owner',
        status: 'active',
      },
    });

    // email owner
    const owner = await this.prisma.prisma().users.findUnique({
      where: { id: ownerId },
      select: { email: true, profiles: { select: { display_name: true } } },
    });
    await this.safeSend(owner?.email, 'owner_project_created', {
      app_name: process.env.APP_NAME,
      project_title: project.title,
      cta_url: `${process.env.APP_BASE_URL}/projects/${project.id}`,
    });

    return project;
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

  async listByOwner(ownerId: string): Promise<ProjectRow[]> {
    return this.prisma.prisma().projects.findMany({
      where: { owner_id: ownerId },
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
    }) as Promise<ProjectRow[]>;
  }

  async update(id: string, ownerId: string, input: UpdateProjectInput) {
    const existing = await this.prisma.prisma().projects.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    const data: any = {
      title: input.title ?? undefined,
      summary: input.summary ?? undefined,
      description: input.description ?? undefined,
      industry: input.industry ?? undefined,
      tags: Array.isArray(input.tags) ? input.tags : undefined,
      status: input.status ? mapProjectStatusToPrisma(input.status) : undefined,
      stage: input.stage ? mapProjectStageToPrisma(input.stage) : undefined,
      visibility: input.visibility ? mapVisibilityToPrisma(input.visibility as ProfileVisibility) : undefined,
      attachment_urls: Array.isArray(input.attachment_urls) ? input.attachment_urls : undefined,
      project_skills: Array.isArray(input.project_skills) ? input.project_skills : undefined,
      project_interests: Array.isArray(input.project_interests) ? input.project_interests : undefined,
      banner_url: input.banner_url ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      updated_at: new Date(),
    };

    const updated = await this.prisma.prisma().projects.update({ where: { id }, data });

    // compute “changes” (liste de champs modifiés)
    const changed: string[] = [];
    for (const key of ['title','summary','description','industry','tags','status','stage','visibility','attachment_urls','banner_url','avatar_url']) {
      const newVal = (data as any)[key];
      if (newVal !== undefined) changed.push(key);
    }

    // emails
    const [owner, memberIds] = await Promise.all([
      this.prisma.prisma().users.findUnique({
        where: { id: ownerId }, select: { email: true, profiles: { select: { display_name: true } } },
      }),
      this.prisma.prisma().project_members.findMany({
        where: { project_id: id, status: 'active' }, select: { user_id: true },
      }),
    ]);

    await this.safeSend(owner?.email, 'owner_project_updated', {
      app_name: process.env.APP_NAME,
      project_title: updated.title ?? existing.title,
      changes: changed,
      cta_url: `${process.env.APP_BASE_URL}/projects/${id}/settings`,
    });

    // notify members (excluding owner)
    if (memberIds.length) {
      const users = await this.prisma.prisma().users.findMany({
        where: { id: { in: memberIds.map(m => m.user_id).filter(uid => uid !== ownerId) } },
        select: { email: true },
      });
      for (const u of users) {
        await this.safeSend(u.email, 'member_project_updated', {
          app_name: process.env.APP_NAME,
          project_title: updated.title ?? existing.title,
          changes: changed,
          cta_url: `${process.env.APP_BASE_URL}/projects/${id}`,
        });
      }
    }

    return this.prisma.prisma().projects.update({ where: { id }, data });
  }

  async delete(id: string, ownerId: string) {
    const existing = await this.prisma.prisma().projects.findUnique({
      where: { id }, select: { owner_id: true, title: true },
    });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    // fetch contacts
    const [owner, memberIds] = await Promise.all([
      this.prisma.prisma().users.findUnique({
        where: { id: ownerId }, select: { email: true },
      }),
      this.prisma.prisma().project_members.findMany({
        where: { project_id: id, status: 'active' }, select: { user_id: true },
      }),
    ]);

    // send emails
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

    let vec = Array.isArray(embedding) && embedding.length === EMBEDDING_DIM ? embedding : undefined;
    if (!vec || vec.length !== EMBEDDING_DIM) {
      try {
        vec = await this.embedder.embedText(query);
      } catch {
        vec = undefined;
      }
    }
    const hasVec = Array.isArray(vec) && vec.length === EMBEDDING_DIM;
    const prelimit = Math.max(1, k * PRESELECT_FACTOR);

    const bm25Rows = await this.prisma
      .prisma()
      .$queryRawUnsafe<Array<any>>(
        `
        WITH q AS (SELECT websearch_to_tsquery('simple', $1) AS query)
        SELECT p.*, ts_rank_cd(p.search_tsv, q.query, 32) AS bm25
        FROM projects p, q
        WHERE p.visibility IN ('public','unlisted')
          AND q.query <> ''::tsquery
          AND q.query @@ p.search_tsv
        ORDER BY bm25 DESC
        LIMIT $2::int
        `,
        query,
        prelimit,
      );

    let vectorRows: Array<any> = [];
    if (hasVec) {
      if (!vec) throw new Error('Embedding vector is undefined');
      const lit = toVectorLiteral(vec, EMBEDDING_DIM);
      vectorRows = await this.withEfSearch(EF_SEARCH, db =>
        db.$queryRawUnsafe<Array<any>>(
          `
          SELECT p.*, (p.embedding <=> '${lit}'::vector) AS distance
          FROM projects p
          WHERE p.visibility IN ('public','unlisted')
            AND p.embedding IS NOT NULL
          ORDER BY p.embedding <=> '${lit}'::vector
          LIMIT $1::int
          `,
          prelimit,
        ),
      );
    }

    const map = new Map<string, any>();
    for (const r of bm25Rows) {
      map.set(r.id, { project: r, bm25: r.bm25 as number, distance: undefined });
    }
    for (const r of vectorRows) {
      if (typeof r.distance !== 'number' || r.distance > VECTOR_DISTANCE_THRESHOLD) continue;
      const existing = map.get(r.id);
      if (existing) existing.distance = r.distance as number;
      else map.set(r.id, { project: r, bm25: 0, distance: r.distance as number });
    }

    const bm25Max = Math.max(0, ...Array.from(map.values()).map(v => v.bm25));
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    const results: Array<{ project: any; score: number; reasons: string[] }> = [];
    for (const { project, bm25, distance } of map.values()) {
      const bm25Norm = bm25Max > 0 ? bm25 / bm25Max : 0;
      const cosine = typeof distance === 'number' ? 1 - distance : 0;
      let finalScore: number;
      if (!hasVec) finalScore = bm25Norm;
      else if (bm25Max === 0) finalScore = cosine;
      else finalScore = BM25_WEIGHT * bm25Norm + COSINE_WEIGHT * cosine;

      const reasons: string[] = [];
      if (bm25Norm >= 0.5) {
        const t = project.title?.toLowerCase() ?? '';
        const s = project.summary?.toLowerCase() ?? '';
        const d = project.description?.toLowerCase() ?? '';
        if (tokens.some(tok => t.includes(tok))) reasons.push('Match textuel (titre)');
        if (tokens.some(tok => s.includes(tok))) reasons.push('Match textuel (résumé)');
        if (tokens.some(tok => d.includes(tok))) reasons.push('Match textuel (description)');
      }
      if (Array.isArray(project.tags) && project.tags.some((tg: string) => tokens.includes(tg.toLowerCase()))) {
        reasons.push('Tags pertinents');
      }
      if (cosine >= 0.7) reasons.push('Similarité sémantique');
      if (!reasons.length) reasons.push('Pertinence générale');

      results.push({ project, score: finalScore, reasons });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
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

    // WHERE
    const where: any = {};

    // visibilities: défaut public+unlisted
    const vis = (filters?.visibilities?.length
      ? filters.visibilities
      : ['public', 'unlisted']) as any[];
    where.visibility = { in: vis.map(v => mapVisibilityToPrisma(v)) };

    if (filters?.stages?.length) {
      where.stage = { in: filters.stages.map(s => mapProjectStageToPrisma(s)) };
    }
    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses.map(s => mapProjectStatusToPrisma(s)) };
    }
    if (filters?.industries?.length) {
      where.industry = { in: filters.industries };
    }
    if (filters?.ownerIds?.length) {
      where.owner_id = { in: filters.ownerIds };
    }
    if (filters?.tagsAny?.length) {
      where.tags = { hasSome: filters.tagsAny };
    }
    if (filters?.skillsAny?.length) {
      where.project_skills = { hasSome: filters.skillsAny };
    }
    if (filters?.skillsAll?.length) {
      where.project_skills = { ...(where.project_skills ?? {}), hasEvery: filters.skillsAll };
    }
    if (filters?.interestsAny?.length) {
      where.project_interests = { hasSome: filters.interestsAny };
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
    if (typeof filters?.hasAttachment === 'boolean') {
      where.attachment_urls = filters.hasAttachment ? { isEmpty: false } : { isEmpty: true };
    }
    if (typeof filters?.hasBanner === 'boolean') {
      where.banner_url = filters.hasBanner ? { not: null } : null;
    }
    if (typeof filters?.hasAvatar === 'boolean') {
      where.avatar_url = filters.hasAvatar ? { not: null } : null;
    }

    // ORDER BY
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
