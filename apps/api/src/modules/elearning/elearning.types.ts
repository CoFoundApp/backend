import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JSONScalar } from '../../common/scalars/json.scalar';
import {
  BlockKind,
  CourseLevel,
  CourseVisibility,
  EnrollmentStatus,
  PublishStatus,
  QuestionType,
} from './elearning.enums';

@ObjectType()
export class TemplateAssetType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  fileUrl!: string;

  @Field(() => String)
  kind!: string;
}

@ObjectType()
export class LessonBlockType {
  @Field(() => String)
  id!: string;

  @Field(() => BlockKind)
  kind!: BlockKind;

  @Field(() => JSONScalar)
  dataJson!: Record<string, any>;

  @Field(() => Int)
  position!: number;
}

@ObjectType()
export class QuizQuestionType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  prompt!: string;

  @Field(() => QuestionType)
  type!: QuestionType;

  @Field(() => JSONScalar, { nullable: true })
  options?: any;

  @Field(() => JSONScalar, { nullable: true })
  answer?: any;

  @Field(() => Int)
  position!: number;
}

@ObjectType()
export class QuizType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Int)
  passScore!: number;

  @Field(() => [QuizQuestionType])
  questions!: QuizQuestionType[];
}

@ObjectType()
export class LessonType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => Int, { nullable: true })
  durationSec?: number | null;

  @Field(() => Int)
  position!: number;

  @Field(() => PublishStatus)
  status!: PublishStatus;

  @Field(() => Boolean)
  gatedByQuiz!: boolean;

  @Field(() => String, { nullable: true })
  archetype?: string | null;

  @Field(() => Int, { nullable: true })
  estimatedMinutes?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  resources?: any;

  @Field(() => String, { nullable: true })
  objectives?: string | null;

  @Field(() => [LessonBlockType])
  blocks!: LessonBlockType[];

  @Field(() => QuizType, { nullable: true })
  quiz?: QuizType | null;

  @Field(() => [TemplateAssetType])
  templateAssets!: TemplateAssetType[];
}

@ObjectType()
export class CourseSectionType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Int)
  position!: number;

  @Field(() => [LessonType])
  lessons!: LessonType[];
}

@ObjectType()
export class CourseTagType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  value!: string;
}

@ObjectType()
export class CourseType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  subtitle?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  coverUrl?: string | null;

  @Field(() => CourseLevel)
  level!: CourseLevel;

  @Field(() => CourseVisibility)
  visibility!: CourseVisibility;

  @Field(() => PublishStatus)
  status!: PublishStatus;

  @Field(() => String)
  language!: string;

  @Field(() => String)
  authorId!: string;

  @Field(() => String, { nullable: true })
  track?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  objectives?: string | null;

  @Field(() => String, { nullable: true })
  outcomes?: string | null;

  @Field(() => Int, { nullable: true })
  estimatedMinutes?: number | null;

  @Field(() => String, { nullable: true })
  prerequisiteCourseId?: string | null;

  @Field(() => [CourseSectionType])
  sections!: CourseSectionType[];

  @Field(() => [CourseTagType])
  tags!: CourseTagType[];

  @Field(() => [TemplateAssetType])
  templateAssets!: TemplateAssetType[];

  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class QuizAttemptType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  quizId!: string;

  @Field(() => Int)
  score!: number;

  @Field(() => Boolean)
  passed!: boolean;

  @Field(() => JSONScalar)
  answers!: any;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class EnrollmentProgressType {
  @Field(() => String)
  id!: string;

  @Field(() => JSONScalar)
  lessonState!: any;

  @Field(() => Int)
  percent!: number;

  @Field(() => String, { nullable: true })
  lastLessonId?: string | null;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class CourseEnrollmentType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  courseId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => EnrollmentStatus)
  status!: EnrollmentStatus;

  @Field(() => Date)
  startedAt!: Date;

  @Field(() => Date, { nullable: true })
  completedAt?: Date | null;

  @Field(() => EnrollmentProgressType, { nullable: true })
  progress?: EnrollmentProgressType | null;

  @Field(() => CourseType, { nullable: true })
  course?: CourseType | null;
}

@ObjectType()
export class CourseCertificateType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  courseId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  serial!: string;

  @Field(() => Date)
  issuedAt!: Date;

  @Field(() => JSONScalar, { nullable: true })
  meta?: any;
}

@ObjectType()
export class CourseStatsType {
  @Field(() => Int)
  totalEnrollments!: number;

  @Field(() => Int)
  activeEnrollments!: number;

  @Field(() => Int)
  completedEnrollments!: number;

  @Field(() => Int)
  averageScore!: number;

  @Field(() => Int)
  completionRate!: number;

  @Field(() => Int)
  averageTimeToCompleteMinutes!: number;
}

@ObjectType()
export class CourseConnection {
  @Field(() => [CourseType])
  items!: CourseType[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}
