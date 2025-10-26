import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProjectPositionInput } from './dto/create-project-position.input';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

@Injectable()
export class ProjectPositionService {
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService
  ) {}

  async create(ownerId: string, input: CreateProjectPositionInput) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: input.project_id },
      select: { owner_id: true, title: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    const position = await this.prisma.prisma().project_positions.create({
      data: {
        project_id: input.project_id,
        title: input.title,
        description: input.description ?? null,
      },
    });

    const owner = await this.prisma.prisma().users.findUnique({
      where: { id: project?.owner_id || '' },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    // Notifier le OWNER (confirmation)
    if (owner?.email) {
      await this.mail.sendTemplate(owner.email, 'owner_position_created', 'en', {
        app_name: this.appName,
        project_title: project?.title ?? input.project_id,
        position_title: position.title,
        description: position.description ?? null,
        cta_url: `${process.env.APP_BASE_URL}/projects/${input.project_id}/positions`,
      });
    }

    return position;
  }

  async list(ownerId: string, projectId: string) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.prisma().project_positions.findMany({ where: { project_id: projectId } });
  }

  async close(ownerId: string, id: string) {
    const position = await this.prisma.prisma().project_positions.findUnique({
      where: { id },
    });
    if (!position) throw new NotFoundException('Position not found');

    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: position.project_id },
      select: { owner_id: true, title: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    const confirmation = await this.prisma.prisma().project_positions.update({
      where: { id },
      data: { status: 'closed', updated_at: new Date() },
    });

    const owner = await this.prisma.prisma().users.findUnique({
      where: { id: project?.owner_id || '' },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    // Notifier le OWNER (confirmation)
    if (owner?.email) {
      await this.mail.sendTemplate(owner.email, 'owner_position_closed', 'en', {
        app_name: this.appName,
        project_title: project?.title ?? position.project_id,
        position_title: position.title,
        status: confirmation.status,
        cta_url: `${process.env.APP_BASE_URL}/projects/${position.project_id}/positions`,
      });
    }

    return confirmation;
  }
}
