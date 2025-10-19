import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, points_source_type } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../../common/enums/domain.enums';
import { Role } from '../auth/role.enum';
import { CourseFilterInput, CoursePaginationInput } from './dto/course-filter.input';
import { makeCursorPage } from '../../common/utils/pagination.util';
import { UpsertCourseInput } from './dto/upsert-course.input';
import { UpsertSectionInput } from './dto/upsert-section.input';
import { UpsertLessonInput } from './dto/upsert-lesson.input';
import { UpsertBlockInput } from './dto/upsert-block.input';
import { UpsertQuizInput } from './dto/upsert-quiz.input';
import { UpsertQuestionInput } from './dto/upsert-question.input';
import { AttachTemplateAssetInput } from './dto/attach-template-asset.input';
import {
  CourseLevel,
  CourseVisibility,
  EnrollmentStatus,
  PublishStatus,
  QuestionType,
} from './elearning.enums';

const GAMIFICATION_POINTS = {
  lessonSeen: 1,
  quizPassed: 10,
  courseCompleted: 100,
  certificateIssued: 25,
};

const PrismaEnrollmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

type PrismaEnrollmentStatus = (typeof PrismaEnrollmentStatus)[keyof typeof PrismaEnrollmentStatus];

type PlanKey = 'free' | 'solo' | 'pro';

interface PlanEntitlements {
  enrollmentCap: number | null;
  certificatesEnabled: boolean;
  canCreateCourse: boolean;
  creatorCourseCap: number | null;
  analytics: 'none' | 'basic' | 'advanced_light' | 'advanced_full';
}

const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  free: { enrollmentCap: 3, certificatesEnabled: false, canCreateCourse: false, creatorCourseCap: 0, analytics: 'none' },
  solo: { enrollmentCap: 9, certificatesEnabled: true, canCreateCourse: false, creatorCourseCap: 0, analytics: 'basic' },
  pro: {
    enrollmentCap: null,
    certificatesEnabled: true,
    canCreateCourse: true,
    creatorCourseCap: 2,
    analytics: 'advanced_light',
  }
};

@Injectable()
export class ElearningService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationService) {}

  private normalizePlan(code?: string | null): PlanKey {
    if (!code) return 'free';
    const normalized = code.toLowerCase();
    if (normalized.startsWith('pro')) return 'pro';
    if (normalized.startsWith('solo')) return 'solo';
    return 'free';
  }

  private toJsonInput(value: Prisma.InputJsonValue | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value;
  }

  private async resolveEntitlements(userId: string, role?: Role | null): Promise<PlanEntitlements> {
    if (role === Role.admin) {
      return { enrollmentCap: null, certificatesEnabled: true, canCreateCourse: true, creatorCourseCap: null, analytics: 'advanced_full' };
    }
    const subscription = await this.prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { started_at: 'desc' },
    });
    const planKey = this.normalizePlan(subscription?.plan_code);
    return PLAN_ENTITLEMENTS[planKey];
  }

  private async enforceEnrollmentCap(userId: string, role: Role | null | undefined, bypassCourseId?: string) {
    const entitlements = await this.resolveEntitlements(userId, role ?? null);
    if (entitlements.enrollmentCap === null) return;
    const count = await this.prisma.enrollment.count({
      where: {
        userId,
        status: EnrollmentStatus.ACTIVE,
        ...(bypassCourseId ? { courseId: { not: bypassCourseId } } : {}),
      },
    });
    if (count >= entitlements.enrollmentCap) {
      throw new ForbiddenException('ENROLLMENT_CAP_REACHED');
    }
  }

  async findCourseBySlug(slug: string, includeDraft = false) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                blocks: { orderBy: { position: 'asc' } },
                quiz: { include: { questions: { orderBy: { position: 'asc' } } } },
                templateAssets: true,
              },
            },
          },
        },
        tags: true,
        templateAssets: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (!includeDraft && course.status !== PublishStatus.PUBLISHED) {
      throw new ForbiddenException('Course not published');
    }
    return course;
  }

  async listCourses(
    filter: CourseFilterInput | undefined,
    pagination?: CoursePaginationInput | null,
    viewerRole?: Role | null,
  ) {
    const where: Prisma.CourseWhereInput = {};
    if (filter?.visibility) where.visibility = filter.visibility as any;
    if (filter?.authorId) where.authorId = filter.authorId;
    if (filter?.level) where.level = filter.level as any;
    if (filter?.track) where.track = filter.track;
    if (filter?.status) where.status = filter.status as any;
    if (filter?.tag) where.tags = { some: { value: filter.tag } };
    if (filter?.text) {
      const text = filter.text;
      where.OR = [
        { title: { contains: text, mode: 'insensitive' } },
        { description: { contains: text, mode: 'insensitive' } },
      ];
    }
    const isAdmin = viewerRole === Role.admin;
    if (!isAdmin) {
      if (!where.status) where.status = PublishStatus.PUBLISHED as any;
      if (!where.visibility) where.visibility = CourseVisibility.PUBLIC as any;
    }
    const take = pagination?.limit ?? 20;
    const cursor = pagination?.cursor ?? null;

    const items = await this.prisma.course.findMany({
      where,
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: { blocks: { orderBy: { position: 'asc' } }, templateAssets: true },
            },
          },
        },
        tags: true,
        templateAssets: true,
      },
    });

    const page = makeCursorPage(items, take);
    return {
      items: page.items,
      nextCursor: page.nextCursor ?? null,
    };
  }

  async myEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        progress: true,
        course: {
          include: {
            sections: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  orderBy: { position: 'asc' },
                  include: { blocks: { orderBy: { position: 'asc' } }, templateAssets: true },
                },
              },
            },
            tags: true,
            templateAssets: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async isUserEnrolled(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } } });
  }

  async getLessonById(id: string, includeDraft = false) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        section: { include: { course: true } },
        blocks: { orderBy: { position: 'asc' } },
        quiz: { include: { questions: { orderBy: { position: 'asc' } } } },
        templateAssets: true,
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!includeDraft && lesson.status !== PublishStatus.PUBLISHED) {
      throw new ForbiddenException('Lesson not published');
    }
    return lesson;
  }

  async getQuizByLessonId(lessonId: string) {
    return this.prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async enrollInCourse(userId: string, courseId: string, role?: Role | null) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.status !== PublishStatus.PUBLISHED && role !== Role.admin && role !== Role.creator) {
      throw new ForbiddenException('Course not available for enrollment');
    }
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { progress: true },
    });
    if (existing?.status === PrismaEnrollmentStatus.ACTIVE) return existing;
    await this.enforceEnrollmentCap(userId, role ?? null, existing?.courseId);
    return this.prisma.$transaction(async (tx) => {
      let enrollmentId = existing?.id ?? null;
      if (existing) {
        const updated = await tx.enrollment.update({
          where: { id: existing.id },
          data: {
            status: PrismaEnrollmentStatus.ACTIVE,
            startedAt: new Date(),
            completedAt: null,
          },
          include: { progress: true },
        });
        enrollmentId = updated.id;
        if (updated.progress) {
          await tx.progress.update({
            where: { id: updated.progress.id },
            data: { lessonState: {}, percent: 0, lastLessonId: null },
          });
        } else {
          await tx.progress.create({ data: { enrollmentId: updated.id, lessonState: {}, percent: 0 } });
        }
      } else {
        const created = await tx.enrollment.create({
          data: {
            courseId,
            userId,
            status: PrismaEnrollmentStatus.ACTIVE,
          },
        });
        enrollmentId = created.id;
        await tx.progress.create({ data: { enrollmentId: created.id, lessonState: {}, percent: 0 } });
      }
      await this.notifications.emit({
        userId,
        type: NotificationType.elearning_enrolled,
        subject_id: courseId,
        payload: { courseId, title: course.title },
      });
      const finalEnrollment = await tx.enrollment.findUnique({ where: { id: enrollmentId! }, include: { progress: true } });
      if (!finalEnrollment) throw new NotFoundException('Enrollment not found after update');
      return finalEnrollment;
    });
  }

  private async getEnrollmentForLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } }, quiz: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: lesson.section.courseId, userId } },
      include: { progress: true },
    });
    if (!enrollment) throw new ForbiddenException('Not enrolled in course');
    if (enrollment.status === PrismaEnrollmentStatus.CANCELLED) throw new ForbiddenException('Enrollment cancelled');
    return { lesson, enrollment: enrollment! };
  }

  private async countPublishedLessons(courseId: string) {
    return this.prisma.lesson.count({
      where: { section: { courseId }, status: PublishStatus.PUBLISHED as any },
    });
  }

  private computeCompletionPercent(state: Record<string, any>, publishedCount: number) {
    if (publishedCount === 0) return 0;
    const completed = Object.values(state).filter((entry: any) => entry?.completedAt).length;
    return Math.min(100, Math.round((completed / publishedCount) * 100));
  }

  async markLessonSeen(userId: string, lessonId: string) {
    const { lesson, enrollment } = await this.getEnrollmentForLesson(userId, lessonId);
    const publishedCount = await this.countPublishedLessons(lesson.section.courseId);
    if (publishedCount === 0) {
      throw new BadRequestException('Course has no published lessons');
    }
    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.progress.findUnique({ where: { enrollmentId: enrollment.id } });
      if (!progress) throw new NotFoundException('Progress not found');
      const state = (progress.lessonState as Prisma.JsonObject | null) ?? {};
      const stateRecord = state as Record<string, any>;
      const existing = stateRecord[lessonId] ?? {};
      const alreadySeen = existing.seen;
      stateRecord[lessonId] = {
        ...existing,
        seen: true,
        ...(lesson.gatedByQuiz ? {} : { completedAt: existing.completedAt ?? new Date().toISOString() }),
      };
      const percent = this.computeCompletionPercent(stateRecord, publishedCount);
      await tx.progress.update({
        where: { id: progress.id },
        data: {
          lessonState: stateRecord,
          percent,
          lastLessonId: lessonId,
        },
      });
      if (!alreadySeen) {
        await this.awardPoints(userId, GAMIFICATION_POINTS.lessonSeen, 'Lesson viewed', lessonId);
      }
      await this.handleCompletionSideEffects(tx, enrollment, percent, userId);
      return tx.enrollment.findUnique({ where: { id: enrollment.id }, include: { progress: true } });
    });
  }

  private normalizeAnswer(value: any) {
    if (Array.isArray(value)) return value.map((v) => String(v)).sort();
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return value;
    return value;
  }

  private gradeQuestion(question: Prisma.QuestionGetPayload<{ select: { type: true; answer: true } }>, answer: any) {
    const expected = question.answer as any;
    const normalizedExpected = this.normalizeAnswer(expected);
    const normalizedProvided = this.normalizeAnswer(answer);
    switch (question.type as QuestionType) {
      case QuestionType.MCQ:
      case QuestionType.SINGLE: {
        if (!Array.isArray(expected) && question.type === QuestionType.MCQ) {
          throw new BadRequestException('MCQ answer must be an array');
        }
        return JSON.stringify(normalizedExpected) === JSON.stringify(normalizedProvided);
      }
      case QuestionType.SHORT_TEXT: {
        return normalizedExpected === normalizedProvided;
      }
      case QuestionType.TRUE_FALSE: {
        return normalizedExpected === normalizedProvided;
      }
      case QuestionType.LONG_TEXT:
      case QuestionType.CODE: {
        throw new BadRequestException('Manual grading required for this question type');
      }
      default:
        return false;
    }
  }

  async submitAttempt(userId: string, quizId: string, answers: Record<string, any>, role?: Role | null) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { section: { include: { course: true } } } },
        questions: { orderBy: { position: 'asc' } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: quiz.lesson.section.courseId, userId } },
      include: { progress: true },
    });
    if (!enrollment) throw new ForbiddenException('Not enrolled');
    const totalQuestions = quiz.questions.length;
    if (totalQuestions === 0) throw new BadRequestException('Quiz has no questions');
    let correct = 0;
    for (const question of quiz.questions) {
      if ([QuestionType.LONG_TEXT, QuestionType.CODE].includes(question.type as QuestionType)) {
        throw new BadRequestException('Manual grading questions are not supported in auto-grader yet');
      }
      const answer = answers[question.id];
      if (this.gradeQuestion(question, answer)) correct += 1;
    }
    const score = Math.round((correct / totalQuestions) * 100);
    const passed = score >= quiz.passScore;
    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attempt.create({
        data: {
          quizId,
          userId,
          answers,
          score,
          passed,
        },
      });
      const progress = await tx.progress.findUnique({ where: { enrollmentId: enrollment.id } });
      if (!progress) throw new NotFoundException('Progress not found');
      const state = (progress.lessonState as Prisma.JsonObject | null) ?? {};
      const stateRecord = state as Record<string, any>;
      const lessonId = quiz.lessonId;
      const existing = stateRecord[lessonId] ?? {};
      const wasPassed = existing.quizPassed;
      stateRecord[lessonId] = {
        ...existing,
        seen: true,
        quizPassed: passed || wasPassed,
        score,
        attempts: (existing.attempts ?? 0) + 1,
        ...(passed ? { completedAt: existing.completedAt ?? new Date().toISOString() } : {}),
      };
      const publishedCount = await this.countPublishedLessons(quiz.lesson.section.courseId);
      const percent = this.computeCompletionPercent(stateRecord, publishedCount);
      await tx.progress.update({
        where: { id: progress.id },
        data: { lessonState: stateRecord, percent, lastLessonId: lessonId },
      });
      if (passed && !wasPassed) {
        await this.awardPoints(userId, GAMIFICATION_POINTS.quizPassed, 'Quiz passed', quizId);
      }
      if (!passed) {
        await this.notifications.emit({
          userId,
          type: NotificationType.elearning_quiz_failed,
          subject_id: quizId,
          payload: { score, passScore: quiz.passScore, courseId: quiz.lesson.section.courseId },
        });
      }
      await this.handleCompletionSideEffects(tx, enrollment, percent, userId);
      return created;
    });
    return attempt;
  }

  private async handleCompletionSideEffects(
    tx: Prisma.TransactionClient,
    enrollment: Prisma.EnrollmentGetPayload<{ include: { course: false } }> & {
      id: string;
      status: PrismaEnrollmentStatus;
      userId: string;
      courseId: string;
    },
    percent: number,
    userId: string,
  ) {
    if (percent < 100 || enrollment.status === PrismaEnrollmentStatus.COMPLETED) return null;
    const updatedEnrollment = await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { status: PrismaEnrollmentStatus.COMPLETED, completedAt: new Date() },
    });
    await this.awardPoints(userId, GAMIFICATION_POINTS.courseCompleted, 'Course completed', enrollment.courseId);
    await this.notifications.emit({
      userId,
      type: NotificationType.elearning_course_completed,
      subject_id: enrollment.courseId,
      payload: { courseId: enrollment.courseId },
    });
    await this.issueCertificateIfEligible(tx, updatedEnrollment);
    return updatedEnrollment;
  }

  private async issueCertificateIfEligible(tx: Prisma.TransactionClient, enrollment: { id: string; courseId: string; userId: string }) {
    const course = await tx.course.findUnique({ where: { id: enrollment.courseId } });
    if (!course) return;
    const entitlements = await this.resolveEntitlements(enrollment.userId, null);
    if (!entitlements.certificatesEnabled) return;
    const existing = await tx.certificate.findUnique({ where: { userId_courseId: { userId: enrollment.userId, courseId: enrollment.courseId } } });
    if (existing) return;
    const serial = `CERT-${randomUUID()}`;
    const certificate = await tx.certificate.create({
      data: {
        courseId: enrollment.courseId,
        userId: enrollment.userId,
        serial,
        enrollmentId: enrollment.id,
      },
    });
    await this.awardPoints(enrollment.userId, GAMIFICATION_POINTS.certificateIssued, 'Certificate issued', certificate.id);
    await this.notifications.emit({
      userId: enrollment.userId,
      type: NotificationType.elearning_certificate_issued,
      subject_id: certificate.id,
      payload: { courseId: enrollment.courseId, serial },
    });
  }

  private async awardPoints(userId: string, points: number, reason: string, sourceId?: string | null) {
    if (!points) return;
    await this.prisma.points_ledger.create({
      data: {
        user_id: userId,
        delta_points: points,
        source_type: points_source_type.action,
        source_id: sourceId ?? null,
        reason,
      },
    });
  }

  async getAdminCourseStats(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const [totalEnrollments, activeEnrollments, completedEnrollments, scoreAggregate, completedRecords] = await this.prisma.$transaction([
      this.prisma.enrollment.count({ where: { courseId } }),
      this.prisma.enrollment.count({ where: { courseId, status: PrismaEnrollmentStatus.ACTIVE } }),
      this.prisma.enrollment.count({ where: { courseId, status: PrismaEnrollmentStatus.COMPLETED } }),
      this.prisma.attempt.aggregate({
        _avg: { score: true },
        where: { quiz: { lesson: { section: { courseId } } } },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId, status: PrismaEnrollmentStatus.COMPLETED, completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
      }),
    ]);
    const avgScore = Math.round(scoreAggregate._avg.score ?? 0);
    const completionRate = totalEnrollments === 0 ? 0 : Math.round((completedEnrollments / totalEnrollments) * 100);
    const avgTimeMinutes = completedRecords.length
      ? Math.round(
          completedRecords.reduce((acc, rec) => acc + ((rec.completedAt!.getTime() - rec.startedAt.getTime()) / 60000), 0) /
            completedRecords.length,
        )
      : 0;
    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageScore: avgScore,
      completionRate,
      averageTimeToCompleteMinutes: avgTimeMinutes,
    };
  }

  private async ensureCourseAuthor(courseId: string, userId: string, role?: Role | null) {
    if (role === Role.admin) return;
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.authorId !== userId) throw new ForbiddenException('Not course owner');
  }

  async upsertCourse(input: UpsertCourseInput, userId: string, role?: Role | null) {
    if (input.id) await this.ensureCourseAuthor(input.id, userId, role);
    const entitlements = await this.resolveEntitlements(userId, role ?? null);
    if (!input.id && !entitlements.canCreateCourse && role !== Role.admin) {
      throw new ForbiddenException('Plan does not allow course creation');
    }
    return this.prisma.$transaction(async (tx) => {
      const baseData: Prisma.CourseUncheckedCreateInput = {
        slug: input.slug,
        title: input.title,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        coverUrl: input.coverUrl ?? null,
        level: (input.level ?? CourseLevel.BEGINNER) as any,
        visibility: (input.visibility ?? CourseVisibility.PUBLIC) as any,
        language: input.language ?? 'fr',
        track: input.track ?? null,
        category: input.category ?? null,
        objectives: input.objectives ?? null,
        outcomes: input.outcomes ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        prerequisiteCourseId: input.prerequisiteCourseId ?? null,
        ownerOrgId: input.ownerOrgId ?? null,
        isTemplate: input.isTemplate ?? false,
        reviewNotes: input.reviewNotes ?? null,
        status: (input.status ?? PublishStatus.DRAFT) as any,
        authorId: userId,
      };
      let course;
      if (input.id) {
        const { authorId: _ignore, ...updateData } = baseData;
        course = await tx.course.update({
          where: { id: input.id },
          data: updateData,
        });
      } else {
        course = await tx.course.create({ data: baseData });
      }
      if (input.tags) {
        await tx.courseTag.deleteMany({ where: { courseId: course.id } });
        if (input.tags.length) {
          await tx.courseTag.createMany({
            data: input.tags.map((value) => ({ courseId: course.id, value })),
            skipDuplicates: true,
          });
        }
      }
      return tx.course.findUnique({
        where: { id: course.id },
        include: {
          sections: {
            include: {
              lessons: {
                include: { blocks: true, templateAssets: true },
              },
            },
          },
          tags: true,
          templateAssets: true,
        },
      });
    });
  }

  async deleteCourse(id: string, userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(id, userId, role);
    await this.prisma.course.delete({ where: { id } });
    return true;
  }

  private async validatePublishableCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: {
              include: { blocks: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.sections.length) throw new BadRequestException('Course requires sections before publishing');
    const totalLessons = course.sections.reduce((acc, section) => acc + section.lessons.length, 0);
    if (!totalLessons) throw new BadRequestException('Course requires lessons before publishing');
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (!lesson.blocks.length) throw new BadRequestException('Lessons must contain content blocks before publishing');
      }
    }
  }

  async publishCourse(id: string, userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(id, userId, role);
    await this.validatePublishableCourse(id);
    if (role !== Role.admin) {
      const entitlements = await this.resolveEntitlements(userId, role ?? null);
      if (entitlements.creatorCourseCap !== null) {
        const publishedCount = await this.prisma.course.count({
          where: { authorId: userId, status: PublishStatus.PUBLISHED as any },
        });
        if (publishedCount >= entitlements.creatorCourseCap) {
          throw new ForbiddenException('Creator course cap reached');
        }
      }
    }
    return this.prisma.course.update({
      where: { id },
      data: { status: PublishStatus.PUBLISHED as any, publishedAt: new Date() },
      include: { sections: { include: { lessons: true } }, tags: true, templateAssets: true },
    });
  }

  async archiveCourse(id: string, userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(id, userId, role);
    return this.prisma.course.update({
      where: { id },
      data: { status: PublishStatus.ARCHIVED as any },
      include: { sections: { include: { lessons: true } }, tags: true, templateAssets: true },
    });
  }

  async upsertSection(input: UpsertSectionInput, userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(input.courseId, userId, role);
    return this.prisma.$transaction(async (tx) => {
      let section;
      if (input.id) {
        section = await tx.section.update({
          where: { id: input.id },
          data: {
            title: input.title,
            position: input.position ?? undefined,
          },
        });
      } else {
        const nextPosition = input.position ?? (await tx.section.count({ where: { courseId: input.courseId } })) + 1;
        section = await tx.section.create({
          data: {
            courseId: input.courseId,
            title: input.title,
            position: nextPosition,
          },
        });
      }
      return tx.section.findUnique({
        where: { id: section.id },
        include: { lessons: { orderBy: { position: 'asc' }, include: { blocks: true, templateAssets: true } } },
      });
    });
  }

  async reorderSections(courseId: string, orderedIds: string[], userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(courseId, userId, role);
    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.section.update({
          where: { id: orderedIds[index] },
          data: { position: index + 1 },
        });
      }
    });
    return this.prisma.course.findUnique({ where: { id: courseId }, include: { sections: { orderBy: { position: 'asc' } } } });
  }

  async deleteSection(id: string, userId: string, role?: Role | null) {
    const section = await this.prisma.section.findUnique({ include: { course: true }, where: { id } });
    if (!section) throw new NotFoundException('Section not found');
    await this.ensureCourseAuthor(section.courseId, userId, role);
    await this.prisma.section.delete({ where: { id } });
    return true;
  }

  async upsertLesson(input: UpsertLessonInput, userId: string, role?: Role | null) {
    const section = await this.prisma.section.findUnique({ include: { course: true }, where: { id: input.sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.ensureCourseAuthor(section.courseId, userId, role);
    return this.prisma.$transaction(async (tx) => {
      let lesson;
      if (input.id) {
        const resourcesValue = input.resources === undefined ? undefined : this.toJsonInput(input.resources);
        lesson = await tx.lesson.update({
          where: { id: input.id },
          data: {
            slug: input.slug,
            title: input.title,
            summary: input.summary ?? null,
            durationSec: input.durationSec ?? null,
            position: input.position ?? undefined,
            gatedByQuiz: input.gatedByQuiz ?? false,
            status: (input.status ?? PublishStatus.DRAFT) as any,
            archetype: input.archetype ?? null,
            estimatedMinutes: input.estimatedMinutes ?? null,
            resources: resourcesValue,
            objectives: input.objectives ?? null,
          },
        });
      } else {
        const nextPosition = input.position ?? (await tx.lesson.count({ where: { sectionId: input.sectionId } })) + 1;
        const resourcesValue = this.toJsonInput(input.resources ?? null);
        lesson = await tx.lesson.create({
          data: {
            sectionId: input.sectionId,
            slug: input.slug,
            title: input.title,
            summary: input.summary ?? null,
            durationSec: input.durationSec ?? null,
            position: nextPosition,
            gatedByQuiz: input.gatedByQuiz ?? false,
            status: (input.status ?? PublishStatus.DRAFT) as any,
            archetype: input.archetype ?? null,
            estimatedMinutes: input.estimatedMinutes ?? null,
            resources: resourcesValue,
            objectives: input.objectives ?? null,
          },
        });
      }
      return tx.lesson.findUnique({
        where: { id: lesson.id },
        include: { blocks: { orderBy: { position: 'asc' } }, quiz: { include: { questions: true } }, templateAssets: true },
      });
    });
  }

  async reorderLessons(sectionId: string, orderedIds: string[], userId: string, role?: Role | null) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.ensureCourseAuthor(section.courseId, userId, role);
    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.lesson.update({ where: { id: orderedIds[index] }, data: { position: index + 1 } });
      }
    });
    return this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { lessons: { orderBy: { position: 'asc' }, include: { blocks: true, templateAssets: true } } },
    });
  }

  async deleteLesson(id: string, userId: string, role?: Role | null) {
    const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    await this.prisma.lesson.delete({ where: { id } });
    return true;
  }

  async upsertBlock(input: UpsertBlockInput, userId: string, role?: Role | null) {
    const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id: input.lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    let block;
    if (input.id) {
      block = await this.prisma.block.update({
        where: { id: input.id },
        data: {
          kind: input.kind as any,
          dataJson: input.dataJson,
          position: input.position ?? undefined,
        },
      });
    } else {
      const nextPosition = input.position ?? (await this.prisma.block.count({ where: { lessonId: input.lessonId } })) + 1;
      block = await this.prisma.block.create({
        data: {
          lessonId: input.lessonId,
          kind: input.kind as any,
          dataJson: input.dataJson,
          position: nextPosition,
        },
      });
    }
    return this.prisma.lesson.findUnique({
      where: { id: block.lessonId },
      include: { blocks: { orderBy: { position: 'asc' } } },
    });
  }

  async reorderBlocks(lessonId: string, orderedIds: string[], userId: string, role?: Role | null) {
    const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.block.update({ where: { id: orderedIds[index] }, data: { position: index + 1 } });
      }
    });
    return this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { blocks: { orderBy: { position: 'asc' } } } });
  }

  async deleteBlock(id: string, userId: string, role?: Role | null) {
    const block = await this.prisma.block.findUnique({ include: { lesson: { include: { section: true } } }, where: { id } });
    if (!block) throw new NotFoundException('Block not found');
    await this.ensureCourseAuthor(block.lesson.section.courseId, userId, role);
    await this.prisma.block.delete({ where: { id } });
    return true;
  }

  async upsertQuiz(input: UpsertQuizInput, userId: string, role?: Role | null) {
    const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id: input.lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    let quiz;
    if (input.id) {
      quiz = await this.prisma.quiz.update({
        where: { id: input.id },
        data: { title: input.title, passScore: input.passScore ?? undefined },
      });
    } else {
      quiz = await this.prisma.quiz.upsert({
        where: { lessonId: input.lessonId },
        create: { lessonId: input.lessonId, title: input.title, passScore: input.passScore ?? 70 },
        update: { title: input.title, passScore: input.passScore ?? undefined },
      });
    }
    return this.prisma.quiz.findUnique({ where: { id: quiz.id }, include: { questions: { orderBy: { position: 'asc' } } } });
  }

  async upsertQuestion(input: UpsertQuestionInput, userId: string, role?: Role | null) {
    const quiz = await this.prisma.quiz.findUnique({ include: { lesson: { include: { section: true } } }, where: { id: input.quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.ensureCourseAuthor(quiz.lesson.section.courseId, userId, role);
    let question;
    if (input.id) {
      const optionsValue = input.options === undefined ? undefined : this.toJsonInput(input.options);
      const answerValue = input.answer === undefined ? undefined : this.toJsonInput(input.answer);
      question = await this.prisma.question.update({
        where: { id: input.id },
        data: {
          prompt: input.prompt,
          type: input.type as any,
          options: optionsValue,
          answer: answerValue,
          position: input.position ?? undefined,
        },
      });
    } else {
      const nextPosition = input.position ?? (await this.prisma.question.count({ where: { quizId: input.quizId } })) + 1;
      const optionsValue = this.toJsonInput(input.options ?? null);
      const answerValue = this.toJsonInput(input.answer ?? null);
      question = await this.prisma.question.create({
        data: {
          quizId: input.quizId,
          prompt: input.prompt,
          type: input.type as any,
          options: optionsValue,
          answer: answerValue,
          position: nextPosition,
        },
      });
    }
    return this.prisma.quiz.findUnique({ where: { id: question.quizId }, include: { questions: { orderBy: { position: 'asc' } } } });
  }

  async deleteQuestion(id: string, userId: string, role?: Role | null) {
    const question = await this.prisma.question.findUnique({ include: { quiz: { include: { lesson: { include: { section: true } } } } }, where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.ensureCourseAuthor(question.quiz.lesson.section.courseId, userId, role);
    await this.prisma.question.delete({ where: { id } });
    return true;
  }

  async attachTemplateAsset(input: AttachTemplateAssetInput, userId: string, role?: Role | null) {
    if (!input.courseId && !input.lessonId) {
      throw new BadRequestException('courseId or lessonId is required');
    }
    if (input.courseId) await this.ensureCourseAuthor(input.courseId, userId, role);
    if (input.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id: input.lessonId } });
      if (!lesson) throw new NotFoundException('Lesson not found');
      await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    }
    return this.prisma.templateAsset.create({
      data: {
        courseId: input.courseId ?? null,
        lessonId: input.lessonId ?? null,
        label: input.label,
        fileUrl: input.fileUrl,
        kind: input.kind,
      },
    });
  }

  async deleteTemplateAsset(id: string, userId: string, role?: Role | null) {
    const asset = await this.prisma.templateAsset.findUnique({ include: { course: true, lesson: { include: { section: true } } }, where: { id } });
    if (!asset) throw new NotFoundException('Template asset not found');
    if (asset.courseId) await this.ensureCourseAuthor(asset.courseId, userId, role);
    if (asset.lesson) await this.ensureCourseAuthor(asset.lesson.section.courseId, userId, role);
    await this.prisma.templateAsset.delete({ where: { id } });
    return true;
  }

  async editorCourse(id: string, userId: string, role?: Role | null) {
    await this.ensureCourseAuthor(id, userId, role);
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: { blocks: { orderBy: { position: 'asc' } }, quiz: { include: { questions: true } }, templateAssets: true },
            },
          },
        },
        tags: true,
        templateAssets: true,
      },
    });
  }

  async editorLesson(id: string, userId: string, role?: Role | null) {
    const lesson = await this.prisma.lesson.findUnique({ include: { section: true }, where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.ensureCourseAuthor(lesson.section.courseId, userId, role);
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { blocks: { orderBy: { position: 'asc' } }, quiz: { include: { questions: true } }, templateAssets: true },
    });
  }

  async editorSearchCourses(userId: string, role: Role | null | undefined, args: { text?: string; track?: string; status?: PublishStatus; tag?: string }) {
    const where: Prisma.CourseWhereInput = { authorId: role === Role.admin ? undefined : userId };
    if (args.track) where.track = args.track;
    if (args.status) where.status = args.status as any;
    if (args.tag) where.tags = { some: { value: args.tag } };
    if (args.text) {
      const text = args.text;
      where.OR = [
        { title: { contains: text, mode: 'insensitive' } },
        { description: { contains: text, mode: 'insensitive' } },
      ];
    }
    return this.prisma.course.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { tags: true },
    });
  }
}
