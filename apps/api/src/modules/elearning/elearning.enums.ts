import { registerEnumType } from '@nestjs/graphql';

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CourseVisibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

export enum PublishStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum BlockKind {
  RICHTEXT = 'RICHTEXT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  EMBED = 'EMBED',
  DOWNLOAD = 'DOWNLOAD',
  CODE = 'CODE',
}

export enum QuestionType {
  MCQ = 'MCQ',
  SINGLE = 'SINGLE',
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  TRUE_FALSE = 'TRUE_FALSE',
  CODE = 'CODE',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(CourseLevel, { name: 'CourseLevel' });
registerEnumType(CourseVisibility, { name: 'CourseVisibility' });
registerEnumType(PublishStatus, { name: 'PublishStatus' });
registerEnumType(BlockKind, { name: 'BlockKind' });
registerEnumType(QuestionType, { name: 'QuestionType' });
registerEnumType(EnrollmentStatus, { name: 'EnrollmentStatus' });
