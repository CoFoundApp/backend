import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import {
  mapProjectStatusToPrisma,
  mapProjectStageToPrisma,
  mapVisibilityToPrisma,
} from '../../common/enums/enum-mapper';
import { ProjectStatus, ProjectStage, ProfileVisibility } from '../../common/enums/domain.enums';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

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
}
