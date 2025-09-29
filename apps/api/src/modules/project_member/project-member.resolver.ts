import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ProjectMember, ProjectInvitation } from './project-member.type';
import { ProjectMemberService } from './project-member.service';
import { MemberRole } from '../../common/enums/domain.enums';

@Resolver(() => ProjectMember)
export class ProjectMemberResolver {
  constructor(private readonly members: ProjectMemberService) {}

  @UseGuards(SessionGuard)
  @Query(() => [ProjectMember], { description: 'Lister les membres d\'un projet' })
  async projectMembers(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.listMembers(user.sub, projectId);
  }

  @UseGuards(SessionGuard)
  @Query(() => [ProjectInvitation], { description: 'Lister les invitations à un projet' })
  async projectInvitations(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.listInvitations(user.sub, projectId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectInvitation, { description: 'Inviter un utilisateur à un projet' })
  async inviteUser(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('invitee_id', { type: () => String }) inviteeId: string,
    @Args('role', { type: () => MemberRole, nullable: true }) role?: MemberRole,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.invite(user.sub, projectId, inviteeId, role ?? MemberRole.MEMBER);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectMember, { description: 'Accepter une invitation à un projet' })
  async acceptInvitation(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('invitation_id', { type: () => String }) invitationId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.accept(user.sub, projectId, invitationId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectInvitation, { description: 'Décliner une invitation à un projet' })
  async declineInvitation(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('invitation_id', { type: () => String }) invitationId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.decline(user.sub, projectId, invitationId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Quitter un projet' })
  async leaveProject(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.leave(user.sub, projectId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => Boolean, { description: 'Retirer un membre d\'un projet' })
  async removeProjectMember(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('user_id', { type: () => String }) userId: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.remove(user.sub, projectId, userId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => ProjectMember, { description: 'Mettre à jour le rôle d\'un membre de projet' })
  async updateProjectMemberRole(
    @CurrentUser() user: JwtUser,
    @Args('project_id', { type: () => String }) projectId: string,
    @Args('user_id', { type: () => String }) userId: string,
    @Args('role', { type: () => MemberRole }) role: MemberRole,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.members.updateRole(user.sub, projectId, userId, role);
  }
}
