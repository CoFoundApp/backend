import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ApplyProjectInput } from './dto/apply-project.input';
import { ApplicationStatus } from '../../common/enums/domain.enums';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

@Injectable()
export class ProjectApplicationService {
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService,
  ) {}

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
    let positionName = "";
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: input.project_id },
      select: { owner_id: true, visibility: true, title: true },
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
      positionName = position.title;
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
        attachment_urls: Array.isArray(input.attachment_urls) ? input.attachment_urls : [],
      } as any,
      include: { project_positions: true },
    })) as any;

    const applicant = await this.prisma.prisma().users.findUnique({
      where: { id: applicantId },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    if (applicant?.email) {
      await this.mail.sendTemplate(applicant?.email || "", 'application_submitted', 'en', {
        applicant_name: applicant?.profiles?.display_name,
        project_name: project.title,
        position_name: positionName,
        status: app.status,
        app_name: this.appName,
      });
    }

    const owner = await this.prisma.prisma().users.findUnique({
      where: { id: project.owner_id },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    if (owner?.email) {
      await this.mail.sendTemplate(owner.email, 'owner_application_received', 'en', {
        owner_name: owner?.profiles?.display_name ?? owner?.email,
        owner_id: project.owner_id,
        project_name: project.title,
        applicant_name: applicant?.profiles?.display_name ?? applicant?.email,
        position_name: positionName,
        app_name: this.appName,
      });
    }

    return { ...app, position: app.project_positions };
  }

  async list(
    applicantId: string,
    status?: ApplicationStatus,
    positionId?: string,
    cursor?: string,
    limit = 20,
  ) {
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

    const results = await this.prisma.prisma().project_applications.findMany({
      where: {
        applicant_id: applicantId,
        status: status ?? undefined,
        position_id: positionId ?? undefined,
        ...cursorFilter,
      },
      orderBy: [
        { created_at: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
      // Pas besoin d'include, les field resolvers s'en chargent
    });

    const items = results.slice(0, limit);
    const nextCursor = results.length > limit
      ? this.encodeCursor(results[limit])
      : undefined;

    return {
      items,
      nextCursor
    };
  }

  async listProjectApplications(
    projectId: string,
    requesterId: string, // L'utilisateur qui fait la demande
    status?: ApplicationStatus,
    positionId?: string,
    cursor?: string,
    limit = 20,
  ) {
    // ✅ 1. Vérifier que le projet existe et que l'utilisateur y a accès
    const project = await this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: {
        owner_id: true,
        project_members: {
          select: { user_id: true },
          where: { user_id: requesterId }
        }
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // ✅ 2. Vérifier que l'utilisateur est propriétaire ou membre
    const isOwner = project.owner_id === requesterId;
    const isMember = project.project_members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Access denied. You must be a project member to view applications.');
    }

    // ✅ 3. Construire le filtre de pagination
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

    // ✅ 4. Récupérer les applications
    const results = (await this.prisma.prisma().project_applications.findMany({
      where: {
        project_id: projectId,
        status: status ?? undefined,
        position_id: positionId ?? undefined,
        ...cursorFilter,
      },
      orderBy: [
        { created_at: 'desc' }, // Plus récent en premier
        { id: 'desc' },
      ],
      take: limit + 1,
      include: {
        project_positions: true,
        users_project_applications_applicant_idTousers: { // Infos du candidat
          select: {
            id: true,
            email: true,
            profiles: {
              select: {
                display_name: true,
                avatar_url: true,
                headline: true,
              }
            }
          }
        },
        users_project_applications_decided_byTousers: { // Qui a pris la décision
          select: {
            id: true,
            email: true,
            profiles: {
              select: {
                display_name: true,
              }
            }
          }
        }
      },
    })) as any[];

    // ✅ 5. Formater les résultats
    const items = results.slice(0, limit).map((a) => ({
      ...a,
      position: a.project_positions,
      applicant: {
        id: a.users_project_applications_applicant_idTousers?.id,
        email: a.users_project_applications_applicant_idTousers?.email,
        display_name: a.users_project_applications_applicant_idTousers?.profiles?.display_name,
        avatar_url: a.users_project_applications_applicant_idTousers?.profiles?.avatar_url,
        headline: a.users_project_applications_applicant_idTousers?.profiles?.headline,
        skills: a.users_project_applications_applicant_idTousers?.skills?.map((s: any) => s.skills) || []
      },
      decidedBy: a.users_project_applications_decided_byTousers ? {
        id: a.users_project_applications_decided_byTousers.id,
        email: a.users_project_applications_decided_byTousers.email,
        display_name: a.users_project_applications_decided_byTousers.profiles?.display_name,
      } : null,
    }));

    const next = results.length > limit ? this.encodeCursor(results[limit]) : undefined;

    return {
      items,
      nextCursor: next,
      projectInfo: {
        id: projectId,
        isOwner,
        isMember: !isOwner && isMember, // Membre mais pas propriétaire
      }
    };
  }

  async withdraw(applicantId: string, id: string) {
    const app = await this.prisma.prisma().project_applications.findUnique({
      where: { id },
      include: { project_positions: true, projects: { select: { title: true, owner_id: true } } },
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

    const applicant = await this.prisma.prisma().users.findUnique({
      where: { id: app.applicant_id },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    if (applicant?.email) {
      await this.mail.sendTemplate(applicant?.email || "", 'application_withdrawn', 'en', {
        applicant_name: applicant?.profiles?.display_name,
        project_name: app.projects.title,
        position_name: app.project_positions?.title,
        status: updated.status,
        app_name: this.appName,
      });
    }

    const owner = await this.prisma.prisma().users.findUnique({
      where: { id: app.projects.owner_id },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    if (owner?.email) {
      await this.mail.sendTemplate(owner.email, 'owner_application_withdrawn', 'en', {
        owner_name: owner?.profiles?.display_name ?? owner?.email,
        project_name: updated.projects?.title,
        applicant_name: applicant?.profiles?.display_name ?? applicant?.email,
        position_name: updated.project_positions?.title ?? null,
        status: updated.status,
        app_name: this.appName,
      });
    }

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
        include: {
          project_positions: { select: { title: true } },
          projects: { select: { title: true } },
        },
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

    const applicant = await this.prisma.prisma().users.findUnique({
      where: { id: app.applicant_id },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    const updated = txn[0] as any;

    if (applicant?.email) {
      await this.mail.sendTemplate(applicant?.email || "", 'application_decided', 'en', {
        applicant_name: applicant?.profiles?.display_name,
        project_name: updated.projects?.title ?? app.project_id,
        position_name: updated.project_positions?.title ?? null,
        status,
        decision_label: status === ApplicationStatus.ACCEPTED ? 'Accepted' : 'Rejected',
        app_name: this.appName,
      });
    }

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
      include: {
        project_positions: { select: { title: true } },
        projects: { select: { title: true } },
      },
    })) as any;

    const applicant = await this.prisma.prisma().users.findUnique({
      where: { id: app.applicant_id },
      select: { email: true, profiles: { select: { display_name: true } } },
    });

    if (applicant?.email) {
      await this.mail.sendTemplate(applicant?.email || "", 'application_canceled', 'en', {
        applicant_name: applicant?.profiles?.display_name,
        project_name: updated.projects?.title ?? app.project_id,
        position_name: updated.project_positions?.title ?? null,
        status: updated.status,
        app_name: this.appName,
      });
    }

    return { ...updated, position: updated.project_positions };
  }
}
