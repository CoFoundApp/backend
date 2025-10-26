import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MemberRole } from '../../common/enums/domain.enums';
import { PrismaClient } from '@prisma/client';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

@Injectable()
export class ProjectMemberService {
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService
  ) {}

  private async getUserContact(userId: string) {
    return this.prisma.prisma().users.findUnique({
      where: { id: userId },
      select: { email: true, profiles: { select: { display_name: true } } },
    });
  }

  private async getProjectInfo(projectId: string) {
    return this.prisma.prisma().projects.findUnique({
      where: { id: projectId },
      select: { title: true, owner_id: true },
    });
  }

  private displayName(u?: { email?: string; profiles?: { display_name?: string | null } | null } | null) {
      return u?.profiles?.display_name ?? u?.email ?? 'User';
    }

  private async safeSend(to: string | null | undefined, template: string, payload: Record<string, any>) {
    if (!to) return;
    try {
      const finalPayload = payload.app_name ? payload : { ...payload, app_name: this.appName };
      await this.mail.sendTemplate(to, template, 'en', finalPayload);
    } catch (e) {
      console.log('mail send failed', { template, to, e });
    }
  }

  private async getMembership(projectId: string, userId: string) {
    return this.prisma.prisma().project_members.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });
  }

  async listMembers(userId: string, projectId: string) {
    return this.prisma.prisma().project_members.findMany({
      where: { project_id: projectId, status: 'active' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            profiles: true
          }
        }
      },
    });
  }

  async listInvitations(userId: string, projectId: string) {
    const me = await this.getMembership(projectId, userId);
    if (!me || (me.role !== 'owner' && me.role !== 'maintainer'))
      throw new ForbiddenException('Not allowed');
    return this.prisma.prisma().project_invitations.findMany({
      where: { project_id: projectId },
    });
  }

  async invite(inviterId: string, projectId: string, inviteeId: string, role: MemberRole) {
    if (inviterId === inviteeId)
      throw new BadRequestException('Cannot invite yourself');
    const inviter = await this.getMembership(projectId, inviterId);
    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'maintainer'))
      throw new ForbiddenException('Not allowed');
    const existingMember = await this.getMembership(projectId, inviteeId);
    if (existingMember) throw new BadRequestException('Already member');
    const pending = await this.prisma.prisma().project_invitations.findFirst({
      where: { project_id: projectId, invitee_id: inviteeId, status: 'pending' },
    });
    if (pending) throw new BadRequestException('Invitation already pending');

    const result = this.prisma.prisma().project_invitations.create({
      data: {
        project_id: projectId,
        inviter_id: inviterId,
        invitee_id: inviteeId,
        role,
        status: 'pending',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const [project, inviterContact, invitee, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(inviterId),
      this.getUserContact(inviteeId),
      // owner = project owner (peut être = inviter si role owner)
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User (invitee)
    await this.safeSend(invitee?.email, 'invitation_created', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      inviter_name: this.displayName(inviterContact),
      role,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Owner (notification)
    await this.safeSend(owner?.email, 'owner_invitation_created', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      inviter_name: this.displayName(inviterContact),
      invitee_name: this.displayName(invitee),
      role,
    });

    return result;
  }

  async accept(userId: string, projectId: string, invitationId: string) {
    const inv = await this.prisma.prisma().project_invitations.findUnique({ where: { id: invitationId } });
    if (!inv || inv.project_id !== projectId || inv.invitee_id !== userId || inv.status !== 'pending') {
      throw new NotFoundException('Invitation not found');
    }

    if (inv.expires_at && inv.expires_at < new Date())
      throw new BadRequestException('Invitation expired');

    const client = this.prisma.prisma() as unknown as PrismaClient;

    await client.$transaction([
      client.project_invitations.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      }),
      client.project_members.upsert({
        where: { project_id_user_id: { project_id: projectId, user_id: userId } },
        update: { role: inv.role, status: 'active' },
        create: { project_id: projectId, user_id: userId, role: inv.role, status: 'active' },
      }),
    ]);

    const [project, user, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(userId),
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User (confirmation)
    await this.safeSend(user?.email, 'invitation_accepted', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      role: 'member',
    });

    // Owner (nouveau membre)
    await this.safeSend(owner?.email, 'owner_invitation_accepted', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      invitee_name: this.displayName(user),
      role: 'member',
    });

    return this.getMembership(projectId, userId);
  }

  async decline(userId: string, projectId: string, invitationId: string) {
    const inv = await this.prisma.prisma().project_invitations.findUnique({ where: { id: invitationId } });
    if (!inv || inv.project_id !== projectId || inv.invitee_id !== userId || inv.status !== 'pending')
      throw new NotFoundException('Invitation not found');
    if (inv.expires_at && inv.expires_at < new Date())
      throw new BadRequestException('Invitation expired');

    const [project, user, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(userId),
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User
    await this.safeSend(user?.email, 'invitation_declined', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
    });

    // Owner
    await this.safeSend(owner?.email, 'owner_invitation_declined', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      invitee_name: this.displayName(user),
    });

    return this.prisma.prisma().project_invitations.update({
      where: { id: invitationId },
      data: { status: 'declined' },
    });
  }

  async leave(userId: string, projectId: string) {
    const member = await this.getMembership(projectId, userId);
    if (!member) throw new NotFoundException('Not a member');
    if (member.role === 'owner') {
      const owners = await this.prisma.prisma().project_members.count({
        where: { project_id: projectId, role: 'owner', NOT: { user_id: userId } },
      });
      if (owners === 0) throw new BadRequestException('Cannot leave as sole owner');
    }
    await this.prisma.prisma().project_members.delete({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });

    const [project, user, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(userId),
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User (confirmation)
    await this.safeSend(user?.email, 'leave_confirmed', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
    });

    // Owner (un membre est parti)
    await this.safeSend(owner?.email, 'owner_member_left', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      member_name: this.displayName(user),
    });

    return true;
  }

  async remove(actorId: string, projectId: string, userId: string) {
    const actor = await this.getMembership(projectId, actorId);
    if (!actor || (actor.role !== 'owner' && actor.role !== 'maintainer'))
      throw new ForbiddenException('Not allowed');
    const target = await this.getMembership(projectId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner')
      throw new BadRequestException('Cannot remove owner');
    await this.prisma.prisma().project_members.delete({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });

    const [project, actorContact, targetContact, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(actorId),
      this.getUserContact(userId),
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User (removed)
    await this.safeSend(targetContact?.email, 'member_removed', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
    });

    // Owner (confirmation / audit)
    await this.safeSend(owner?.email, 'owner_member_removed', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      member_name: this.displayName(targetContact),
      actor_name: this.displayName(actorContact),
    });

    return true;
  }

  async updateRole(actorId: string, projectId: string, userId: string, role: MemberRole) {
    const actor = await this.getMembership(projectId, actorId);
    if (!actor || actor.role !== 'owner') throw new ForbiddenException('Not allowed');
    const target = await this.getMembership(projectId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner' && role !== 'owner') {
      const owners = await this.prisma.prisma().project_members.count({
        where: { project_id: projectId, role: 'owner', NOT: { user_id: userId } },
      });
      if (owners === 0) throw new BadRequestException('Cannot remove last owner');
    }

    const [project, actorContact, targetContact, owner] = await Promise.all([
      this.getProjectInfo(projectId),
      this.getUserContact(actorId),
      this.getUserContact(userId),
      this.getProjectInfo(projectId).then(p => p ? this.getUserContact(p.owner_id) : null),
    ]);

    // User (role changé)
    await this.safeSend(targetContact?.email, 'role_updated', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      role,
    });

    // Owner (audit)
    await this.safeSend(owner?.email, 'owner_role_updated', {
      app_name: this.appName,
      project_title: project?.title ?? projectId,
      member_name: this.displayName(targetContact),
      actor_name: this.displayName(actorContact),
      role,
    });

    return this.prisma.prisma().project_members.update({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      data: { role },
    });
  }
}
