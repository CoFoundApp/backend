import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProjectPositionInput } from './dto/create-project-position.input';

@Injectable()
export class ProjectPositionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, input: CreateProjectPositionInput) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: input.project_id },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    return this.prisma.prisma().project_positions.create({
      data: {
        project_id: input.project_id,
        title: input.title,
        description: input.description ?? null,
      },
    });
  }

  async list(ownerId: string, projectId: string) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    return this.prisma.prisma().project_positions.findMany({ where: { project_id: projectId } });
  }

  async close(ownerId: string, id: string) {
    const position = await this.prisma.prisma().project_positions.findUnique({
      where: { id },
    });
    if (!position) throw new NotFoundException('Position not found');

    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: position.project_id },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    return this.prisma.prisma().project_positions.update({
      where: { id },
      data: { status: 'closed', updated_at: new Date() },
    });
  }
}
