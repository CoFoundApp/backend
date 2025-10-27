import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ElearningService } from './elearning.service';
import { CourseType, CourseSectionType, LessonType, QuizType, TemplateAssetType } from './elearning.types';
import { UpsertCourseInput } from './dto/upsert-course.input';
import { UpsertSectionInput } from './dto/upsert-section.input';
import { UpsertLessonInput } from './dto/upsert-lesson.input';
import { UpsertBlockInput } from './dto/upsert-block.input';
import { UpsertQuizInput } from './dto/upsert-quiz.input';
import { UpsertQuestionInput } from './dto/upsert-question.input';
import { AttachTemplateAssetInput } from './dto/attach-template-asset.input';
import { PublishStatus } from './elearning.enums';

@Resolver()
@UseGuards(SessionGuard, RolesGuard)
@Roles(Role.admin, Role.creator)
export class ElearningEditorResolver {
  constructor(private readonly service: ElearningService) {}

  @Query(() => CourseType)
  async editorCourse(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    return this.service.editorCourse(id, user.sub, user.role as Role);
  }

  @Query(() => LessonType)
  async editorLesson(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    return this.service.editorLesson(id, user.sub, user.role as Role);
  }

  @Query(() => [CourseType])
  async editorSearchCourses(
    @Args('text', { type: () => String, nullable: true }) text: string | undefined,
    @Args('track', { type: () => String, nullable: true }) track: string | undefined,
    @Args('status', { type: () => PublishStatus, nullable: true }) status: PublishStatus | undefined,
    @Args('tag', { type: () => String, nullable: true }) tag: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.editorSearchCourses(user.sub, user.role as Role, { text, track, status, tag });
  }

  @Mutation(() => CourseType)
  async upsertCourse(@Args('input') input: UpsertCourseInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertCourse(input, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteCourse(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteCourse(id, user.sub, user.role as Role);
    return true;
  }

  @Mutation(() => CourseType)
  async publishCourse(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    return this.service.publishCourse(id, user.sub, user.role as Role);
  }

  @Mutation(() => CourseType)
  async archiveCourse(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    return this.service.archiveCourse(id, user.sub, user.role as Role);
  }

  @Mutation(() => CourseSectionType)
  async upsertSection(@Args('input') input: UpsertSectionInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertSection(input, user.sub, user.role as Role);
  }

  @Mutation(() => CourseType)
  async reorderSections(
    @Args('courseId', { type: () => String }) courseId: string,
    @Args('orderedIds', { type: () => [String] }) orderedIds: string[],
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reorderSections(courseId, orderedIds, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteSection(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteSection(id, user.sub, user.role as Role);
    return true;
  }

  @Mutation(() => LessonType)
  async upsertLesson(@Args('input') input: UpsertLessonInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertLesson(input, user.sub, user.role as Role);
  }

  @Mutation(() => CourseSectionType)
  async reorderLessons(
    @Args('sectionId', { type: () => String }) sectionId: string,
    @Args('orderedIds', { type: () => [String] }) orderedIds: string[],
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reorderLessons(sectionId, orderedIds, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteLesson(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteLesson(id, user.sub, user.role as Role);
    return true;
  }

  @Mutation(() => LessonType)
  async upsertBlock(@Args('input') input: UpsertBlockInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertBlock(input, user.sub, user.role as Role);
  }

  @Mutation(() => LessonType)
  async reorderBlocks(
    @Args('lessonId', { type: () => String }) lessonId: string,
    @Args('orderedIds', { type: () => [String] }) orderedIds: string[],
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reorderBlocks(lessonId, orderedIds, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteBlock(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteBlock(id, user.sub, user.role as Role);
    return true;
  }

  @Mutation(() => QuizType)
  async upsertQuiz(@Args('input') input: UpsertQuizInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertQuiz(input, user.sub, user.role as Role);
  }

  @Mutation(() => QuizType)
  async upsertQuestion(@Args('input') input: UpsertQuestionInput, @CurrentUser() user: JwtUser) {
    return this.service.upsertQuestion(input, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteQuestion(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteQuestion(id, user.sub, user.role as Role);
    return true;
  }

  @Mutation(() => TemplateAssetType)
  async attachTemplateAsset(@Args('input') input: AttachTemplateAssetInput, @CurrentUser() user: JwtUser) {
    return this.service.attachTemplateAsset(input, user.sub, user.role as Role);
  }

  @Mutation(() => Boolean)
  async deleteTemplateAsset(@Args('id', { type: () => String }) id: string, @CurrentUser() user: JwtUser) {
    await this.service.deleteTemplateAsset(id, user.sub, user.role as Role);
    return true;
  }
}
