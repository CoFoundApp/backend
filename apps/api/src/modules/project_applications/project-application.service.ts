import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ApplyProjectInput } from './dto/apply-project.input';
import { ApplicationStatus } from '../../common/enums/domain.enums';

@Injectable()
export class ProjectApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private encodeCursor(app: { created_at: Date; id: string }) {
    return Buffer.from(
      `${app.created_at.toISOString()}::${app.id}`,
    ).toString('base64');
  }

  private decodeCursor(cursor: string) {
    const [date, id] = Buffer.from(cursor, 'base64').toString().split('::');
    return { created_at: new Date(date), id };
  }

  async apply(applicantId: string, input: ApplyProjectInput) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: input.project_id },
      select: { owner_id: true, visibility: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id === applicantId)
      throw new ForbiddenException('Cannot apply to own project');
    if (!['public', 'unlisted'].includes(project.visibility))
      throw new BadRequestException('Project not eligible');

    if (input.position_id) {
      const position = await this.prisma
        .prisma()
        .project_positions.findUnique({ where: { id: input.position_id } });
      if (!position) throw new BadRequestException('Position not found');
      if (position.project_id !== input.project_id)
        throw new BadRequestException('Position not in project');
      if (position.status !== 'open')
        throw new BadRequestException('Position closed');
    }

    const pending = await this.prisma.prisma().project_applications.findFirst({
      where: {
        project_id: input.project_id,
        applicant_id: applicantId,
        status: ApplicationStatus.PENDING,
      },
    });
    if (pending)
      throw new BadRequestException(
        'Already have a pending application for this project',
      );

    const app = (await this.prisma.prisma().project_applications.create({
      data: {
        project_id: input.project_id,
        applicant_id: applicantId,
        position_id: input.position_id ?? null,
        note: input.note ?? null,
      } as any,
      include: { project_positions: true },
    })) as any;
    return { ...app, position: app.project_positions };
  }

  async list(
    ownerId: string,
    projectId: string,
    status?: ApplicationStatus,
    positionId?: string,
    cursor?: string,
    limit = 20,
  ) {
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    let cursorFilter: any = {};
    if (cursor) {
      const c = this.decodeCursor(cursor);
      cursorFilter = {
        OR: [
          { created_at: { gt: c.created_at } },
          {
            AND: [
              { created_at: c.created_at },
              { id: { gt: c.id } },
            ],
          },
        ],
      };
    }

    const results = (await this.prisma.prisma().project_applications.findMany({
      where: {
        project_id: projectId,
        status: status ?? undefined,
        position_id: positionId ?? undefined,
        ...cursorFilter,
      },
      orderBy: [
        { created_at: 'asc' },
        { id: 'asc' },
      ],
      take: limit + 1,
      include: { project_positions: true },
    })) as any[];

    const items = results.slice(0, limit).map((a) => ({
      ...a,
      position: a.project_positions,
    }));
    const next =
      results.length > limit
        ? this.encodeCursor(results[limit])
        : undefined;
    return { items, nextCursor: next };
  }

  async withdraw(applicantId: string, id: string) {
    const app = await this.prisma.prisma().project_applications.findUnique({
      where: { id },
      include: { project_positions: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.applicant_id !== applicantId)
      throw new ForbiddenException('Not candidate');
    if (app.status !== ApplicationStatus.PENDING)
      throw new BadRequestException('Invalid state');

    const updated = (await this.prisma.prisma().project_applications.update({
      where: { id },
      data: { status: ApplicationStatus.WITHDRAWN, updated_at: new Date() },
      include: { project_positions: true },
    })) as any;
    return { ...updated, position: updated.project_positions };
  }

  async decide(
    ownerId: string,
    id: string,
    status: ApplicationStatus,
    positionId?: string,
  ) {
    if (![ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED].includes(status))
      throw new BadRequestException('Invalid decision');

    const app = await this.prisma.prisma().project_applications.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.PENDING)
      throw new BadRequestException('Invalid state');

    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: app.project_id },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    if (positionId && app.position_id !== positionId)
      throw new BadRequestException('Application not for this position');

    const txn = await this.prisma.$transaction([
      this.prisma.project_applications.update({
        where: { id },
        data: {
          status,
          decided_by: ownerId,
          decided_at: new Date(),
          updated_at: new Date(),
        },
        include: { project_positions: true },
      }) as any,
      ...(status === ApplicationStatus.ACCEPTED
        ? [
            this.prisma.project_members.upsert({
              where: {
                project_id_user_id: {
                  project_id: app.project_id,
                  user_id: app.applicant_id,
                },
              },
              update: {},
              create: {
                project_id: app.project_id,
                user_id: app.applicant_id,
              },
            }) as any,
          ]
        : []),
    ]);

    const updated = txn[0] as any;
    return { ...updated, position: updated.project_positions };
  }

  async cancel(ownerId: string, id: string) {
    const app = await this.prisma.prisma().project_applications.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.PENDING)
      throw new BadRequestException('Invalid state');

    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: app.project_id },
      select: { owner_id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.owner_id !== ownerId) throw new ForbiddenException('Not owner');

    const updated = (await this.prisma.prisma().project_applications.update({
      where: { id },
      data: {
        status: ApplicationStatus.CANCELED,
        decided_by: ownerId,
        decided_at: new Date(),
        updated_at: new Date(),
      } as any,
      include: { project_positions: true },
    })) as any;
    return { ...updated, position: updated.project_positions };
  }
}
