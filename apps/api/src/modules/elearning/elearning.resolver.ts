import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ElearningService } from './elearning.service';
import { CourseConnection, CourseStatsType, CourseType, LessonType, QuizAttemptType, QuizType, CourseEnrollmentType } from './elearning.types';
import { CourseFilterInput, CoursePaginationInput } from './dto/course-filter.input';
import { CourseVisibility, PublishStatus } from './elearning.enums';
import { JSONScalar } from '../../common/scalars/json.scalar';

@Resolver()
export class ElearningResolver {
  constructor(private readonly service: ElearningService) {}

  @Query(() => CourseType)
  async course(
    @Args('slug', { type: () => String }) slug: string,
    @CurrentUser() user?: JwtUser | null,
  ) {
    const includeDraft = user?.role === Role.admin || user?.role === Role.creator;
    const course = await this.service.findCourseBySlug(slug, includeDraft);
    if (course.visibility === CourseVisibility.PRIVATE) {
      if (!user) throw new ForbiddenException('Course is private');
      if (user.role === Role.admin || user.role === Role.creator || course.authorId === user.sub) return course;
      const enrollment = await this.service.isUserEnrolled(user.sub, course.id);
      if (!enrollment) throw new ForbiddenException('Course is private');
    }
    if (course.status !== PublishStatus.PUBLISHED && course.authorId !== user?.sub && user?.role !== Role.admin) {
      throw new ForbiddenException('Course not published');
    }
    return course;
  }

  @Query(() => CourseConnection)
  async courses(
    @Args('filter', { type: () => CourseFilterInput, nullable: true }) filter?: CourseFilterInput,
    @Args('pagination', { type: () => CoursePaginationInput, nullable: true }) pagination?: CoursePaginationInput,
    @CurrentUser() user?: JwtUser | null,
  ) {
    return this.service.listCourses(filter, pagination ?? null, user ? (user.role as Role) : null);
  }

  @UseGuards(SessionGuard)
  @Query(() => [CourseEnrollmentType])
  async myEnrollments(@CurrentUser() user: JwtUser) {
    return this.service.myEnrollments(user.sub);
  }

  @Query(() => LessonType)
  async lesson(
    @Args('id', { type: () => String }) id: string,
    @CurrentUser() user?: JwtUser | null,
  ) {
    const includeDraft = user?.role === Role.admin || user?.role === Role.creator;
    const lesson = await this.service.getLessonById(id, includeDraft);
    if (lesson.section.course.visibility === CourseVisibility.PRIVATE) {
      if (!user) throw new ForbiddenException('Course is private');
      if (user.role !== Role.admin && user.role !== Role.creator && lesson.section.course.authorId !== user.sub) {
        const enrollment = await this.service.isUserEnrolled(user.sub, lesson.section.courseId);
        if (!enrollment) throw new ForbiddenException('Course is private');
      }
    }
    if (lesson.status !== PublishStatus.PUBLISHED && lesson.section.course.authorId !== user?.sub && user?.role !== Role.admin) {
      throw new ForbiddenException('Lesson not published');
    }
    return lesson;
  }

  @UseGuards(SessionGuard)
  @Query(() => QuizType, { nullable: true })
  async quiz(
    @Args('lessonId', { type: () => String }) lessonId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const lesson = await this.service.getLessonById(lessonId, true);
    if (lesson.section.course.visibility === CourseVisibility.PRIVATE) {
      if (lesson.section.course.authorId !== user.sub && user.role !== Role.admin && user.role !== Role.creator) {
        const enrollment = await this.service.isUserEnrolled(user.sub, lesson.section.courseId);
        if (!enrollment) throw new ForbiddenException('Course is private');
      }
    }
    if (lesson.status !== PublishStatus.PUBLISHED && lesson.section.course.authorId !== user.sub && user.role !== Role.admin) {
      throw new ForbiddenException('Lesson not published');
    }
    return this.service.getQuizByLessonId(lessonId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => CourseEnrollmentType)
  async enroll(
    @Args('courseId', { type: () => String }) courseId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.enrollInCourse(user.sub, courseId, user.role as Role);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => CourseEnrollmentType)
  async markLessonSeen(
    @Args('lessonId', { type: () => String }) lessonId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.markLessonSeen(user.sub, lessonId);
  }

  @UseGuards(SessionGuard)
  @Mutation(() => QuizAttemptType)
  async submitAttempt(
    @Args('quizId', { type: () => String }) quizId: string,
    @Args('answers', { type: () => JSONScalar }) answers: Record<string, any>,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.submitAttempt(user.sub, quizId, answers, user.role as Role);
  }

  @UseGuards(SessionGuard, RolesGuard)
  @Roles(Role.admin)
  @Query(() => CourseStatsType)
  async adminCourseStats(@Args('courseId', { type: () => String }) courseId: string) {
    return this.service.getAdminCourseStats(courseId);
  }
}
