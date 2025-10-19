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

export enum WorkStyle {
  AUTONOMOUS = 'autonomous',
  COLLABORATIVE = 'collaborative',
  STRUCTURED = 'structured',
  AGILE = 'agile',
}

export enum CoreValue {
  INNOVATION = 'innovation',
  STABILITY = 'stability',
  SOCIAL_IMPACT = 'social_impact',
  GROWTH = 'growth',
}

export enum Motivation {
  LEARN = 'learn',
  EARN = 'earn',
  CREATE = 'create',
  HELP = 'help',
  TEACH = 'teach',
}

export enum EnvironmentPreference {
  STARTUP = 'startup',
  SCALEUP = 'scaleup',
  ENTERPRISE = 'enterprise',
  SOLO = 'solo',
}

export enum TeamRolePreference {
  LEADER = 'leader',
  CONTRIBUTOR = 'contributor',
  MENTOR = 'mentor',
  LEARNER = 'learner',
}

export enum CommunicationStylePreference {
  DIRECT = 'direct',
  DIPLOMATIC = 'diplomatic',
  FORMAL = 'formal',
  CASUAL = 'casual',
}

export enum CommunicationFrequencyPreference {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  ASYNC = 'async',
}

export enum TeamSizePreference {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FLEXIBLE = 'flexible',
}

export enum ManagementStyle {
  HANDS_ON = 'hands_on',
  HANDS_OFF = 'hands_off',
  COACHING = 'coaching',
  SELF_MANAGED = 'self_managed',
}

export enum CollaborationMode {
  SYNCHRONOUS = 'synchronous',
  ASYNCHRONOUS = 'asynchronous',
  HYBRID = 'hybrid',
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
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
  new_message = 'new_message',
  elearning_enrolled = 'elearning_enrolled',
  elearning_course_completed = 'elearning_course_completed',
  elearning_certificate_issued = 'elearning_certificate_issued',
  elearning_quiz_failed = 'elearning_quiz_failed',
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
registerEnumType(WorkStyle, { name: 'WorkStyle' });
registerEnumType(CoreValue, { name: 'CoreValue' });
registerEnumType(Motivation, { name: 'Motivation' });
registerEnumType(EnvironmentPreference, { name: 'EnvironmentPreference' });
registerEnumType(TeamRolePreference, { name: 'TeamRolePreference' });
registerEnumType(CommunicationStylePreference, { name: 'CommunicationStylePreference' });
registerEnumType(CommunicationFrequencyPreference, { name: 'CommunicationFrequencyPreference' });
registerEnumType(TeamSizePreference, { name: 'TeamSizePreference' });
registerEnumType(ManagementStyle, { name: 'ManagementStyle' });
registerEnumType(CollaborationMode, { name: 'CollaborationMode' });
registerEnumType(UrgencyLevel, { name: 'UrgencyLevel' });
