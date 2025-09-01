import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MemberRole } from '../../common/enums/domain.enums';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProjectMemberService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMembership(projectId: string, userId: string) {
    return this.prisma.prisma().project_members.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });
  }

  async listMembers(userId: string, projectId: string) {
    const me = await this.getMembership(projectId, userId);
    if (!me) throw new ForbiddenException('Not a member');
    return this.prisma.prisma().project_members.findMany({
      where: { project_id: projectId, status: 'active' },
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
    return this.prisma.prisma().project_invitations.create({
      data: {
        project_id: projectId,
        inviter_id: inviterId,
        invitee_id: inviteeId,
        role,
        status: 'pending',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
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

    return this.getMembership(projectId, userId);
  }

  async decline(userId: string, projectId: string, invitationId: string) {
    const inv = await this.prisma.prisma().project_invitations.findUnique({ where: { id: invitationId } });
    if (!inv || inv.project_id !== projectId || inv.invitee_id !== userId || inv.status !== 'pending')
      throw new NotFoundException('Invitation not found');
    if (inv.expires_at && inv.expires_at < new Date())
      throw new BadRequestException('Invitation expired');
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
    return this.prisma.prisma().project_members.update({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      data: { role },
    });
  }
}
