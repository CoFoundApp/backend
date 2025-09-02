import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INVITED = 'invited',
  DELETED = 'deleted',
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

export enum LanguageCode {
  FR = 'fr',
  EN = 'en',
  ES = 'es',
  DE = 'de',
  IT = 'it',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  SEEKING = 'seeking',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ProjectStage {
  IDEA = 'idea',
  MVP = 'mvp',
  TRACTION = 'traction',
  SCALE = 'scale',
}

export enum MemberRole {
  OWNER = 'owner',
  MAINTAINER = 'maintainer',
  MEMBER = 'member',
  MENTOR = 'mentor',
}

export enum MemberStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  LEFT = 'left',
  REMOVED = 'removed',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  CANCELED = 'canceled',
}

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum NotificationType {
  application_submitted = 'application_submitted',
  application_accepted = 'application_accepted',
  application_rejected = 'application_rejected',
  application_canceled = 'application_canceled',
  application_withdrawn = 'application_withdrawn',
  invitation_sent = 'invitation_sent',
  invitation_accepted = 'invitation_accepted',
  invitation_declined = 'invitation_declined',
  member_removed = 'member_removed',
  member_left = 'member_left',
  project_position_opened = 'project_position_opened',
  project_updated = 'project_updated',
}

export enum EmailFrequency {
  immediate = 'immediate',
  digest_daily = 'digest_daily',
  digest_weekly = 'digest_weekly',
  off = 'off',
}

registerEnumType(NotificationType, { name: 'NotificationType' });
registerEnumType(EmailFrequency, { name: 'EmailFrequency' });
registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(UserStatus, { name: 'UserStatus' });
registerEnumType(ProfileVisibility, { name: 'ProfileVisibility' });
registerEnumType(LanguageCode, { name: 'LanguageCode' });
registerEnumType(ProjectStatus, { name: 'ProjectStatus' });
registerEnumType(ProjectStage, { name: 'ProjectStage' });
registerEnumType(MemberRole, { name: 'MemberRole' });
registerEnumType(MemberStatus, { name: 'MemberStatus' });
registerEnumType(ApplicationStatus, { name: 'ApplicationStatus' });
registerEnumType(PositionStatus, { name: 'PositionStatus' });
registerEnumType(InvitationStatus, { name: 'InvitationStatus' });
