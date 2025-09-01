import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import {
  mapProjectStatusToPrisma,
  mapProjectStageToPrisma,
  mapVisibilityToPrisma,
} from '../../common/enums/enum-mapper';
import { ProfileVisibility } from '../../common/enums/domain.enums';

import { EMBEDDING_PORT, EmbeddingPort, EMBEDDING_DIM } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { PrismaClient } from '@prisma/client';

const BM25_WEIGHT = 0.6;
const COSINE_WEIGHT = 0.4;
const VECTOR_DISTANCE_THRESHOLD = 0.6;
const PRESELECT_FACTOR = 5;
const EF_SEARCH = 40;

type DbLike = {
  $executeRawUnsafe: (query: string, ...params: any[]) => Promise<any>;
  $queryRawUnsafe: <T = any>(query: string, ...params: any[]) => Promise<T>;
};
@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort
) {}

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
    return project;
  }

  async findById(id: string) {
    return this.prisma.prisma().projects.findUnique({ where: { id } });
  }

  async listByOwner(ownerId: string) {
    return this.prisma.prisma().projects.findMany({ where: { owner_id: ownerId } });
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
      updated_at: new Date(),
    };
    return this.prisma.prisma().projects.update({ where: { id }, data });
  }

  async delete(id: string, ownerId: string) {
    const existing = await this.prisma.prisma().projects.findUnique({ where: { id }, select: { owner_id: true } });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.owner_id !== ownerId) throw new ForbiddenException('Not owner');
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
}
