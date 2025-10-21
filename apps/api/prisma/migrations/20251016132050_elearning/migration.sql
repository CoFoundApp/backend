-- CreateEnum
CREATE TYPE "public"."elearning_course_level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."elearning_course_visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."elearning_publish_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."elearning_block_kind" AS ENUM ('RICHTEXT', 'VIDEO', 'AUDIO', 'IMAGE', 'EMBED', 'DOWNLOAD', 'CODE');

-- CreateEnum
CREATE TYPE "public"."elearning_question_type" AS ENUM ('MCQ', 'SINGLE', 'SHORT_TEXT', 'LONG_TEXT', 'TRUE_FALSE', 'CODE');

-- CreateEnum
CREATE TYPE "public"."elearning_enrollment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."motivation" ADD VALUE 'teach';

-- AlterEnum
ALTER TYPE "public"."user_role" ADD VALUE 'creator';

-- CreateTable
CREATE TABLE "public"."elearning_courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "level" "public"."elearning_course_level" NOT NULL DEFAULT 'BEGINNER',
    "visibility" "public"."elearning_course_visibility" NOT NULL DEFAULT 'PUBLIC',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "author_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "public"."elearning_publish_status" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT,
    "track" TEXT,
    "objectives" TEXT,
    "outcomes" TEXT,
    "prerequisite_course_id" UUID,
    "estimated_minutes" INTEGER,
    "owner_org_id" UUID,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "review_notes" TEXT,

    CONSTRAINT "elearning_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "elearning_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "duration_sec" INTEGER,
    "position" INTEGER NOT NULL,
    "gated_by_quiz" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "status" "public"."elearning_publish_status" NOT NULL DEFAULT 'DRAFT',
    "archetype" TEXT,
    "estimated_minutes" INTEGER,
    "resources" JSONB,
    "objectives" TEXT,

    CONSTRAINT "elearning_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "kind" "public"."elearning_block_kind" NOT NULL,
    "data_json" JSONB NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "elearning_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "pass_score" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "elearning_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "public"."elearning_question_type" NOT NULL,
    "options" JSONB,
    "answer" JSONB,
    "position" INTEGER NOT NULL,

    CONSTRAINT "elearning_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elearning_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "public"."elearning_enrollment_status" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "elearning_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "lesson_state" JSONB NOT NULL DEFAULT '{}',
    "percent" INTEGER NOT NULL DEFAULT 0,
    "last_lesson_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "elearning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serial" TEXT NOT NULL,
    "meta" JSONB,
    "enrollment_id" UUID,

    CONSTRAINT "elearning_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_course_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "elearning_course_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."elearning_template_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID,
    "lesson_id" UUID,
    "label" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elearning_template_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "elearning_courses_slug_key" ON "public"."elearning_courses"("slug");

-- CreateIndex
CREATE INDEX "idx_elearning_course_status_visibility" ON "public"."elearning_courses"("status", "visibility");

-- CreateIndex
CREATE INDEX "idx_elearning_course_track" ON "public"."elearning_courses"("track");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_section_position" ON "public"."elearning_sections"("course_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_lesson_slug" ON "public"."elearning_lessons"("section_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_lesson_position" ON "public"."elearning_lessons"("section_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_block_position" ON "public"."elearning_blocks"("lesson_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "elearning_quizzes_lesson_id_key" ON "public"."elearning_quizzes"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_question_position" ON "public"."elearning_questions"("quiz_id", "position");

-- CreateIndex
CREATE INDEX "idx_elearning_attempt_quiz_user_created" ON "public"."elearning_attempts"("quiz_id", "user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_enrollment_course_user" ON "public"."elearning_enrollments"("course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "elearning_progress_enrollment_id_key" ON "public"."elearning_progress"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "elearning_certificates_serial_key" ON "public"."elearning_certificates"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "elearning_certificates_enrollment_id_key" ON "public"."elearning_certificates"("enrollment_id");

-- CreateIndex
CREATE INDEX "idx_elearning_certificate_user_course" ON "public"."elearning_certificates"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_certificate_user_course" ON "public"."elearning_certificates"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_elearning_course_tag_value" ON "public"."elearning_course_tags"("value");

-- CreateIndex
CREATE UNIQUE INDEX "uq_elearning_course_tag" ON "public"."elearning_course_tags"("course_id", "value");

-- CreateIndex
CREATE INDEX "idx_elearning_template_asset_course" ON "public"."elearning_template_assets"("course_id");

-- CreateIndex
CREATE INDEX "idx_elearning_template_asset_lesson" ON "public"."elearning_template_assets"("lesson_id");

-- AddForeignKey
ALTER TABLE "public"."elearning_courses" ADD CONSTRAINT "elearning_courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_courses" ADD CONSTRAINT "elearning_courses_prerequisite_course_id_fkey" FOREIGN KEY ("prerequisite_course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_courses" ADD CONSTRAINT "elearning_courses_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_sections" ADD CONSTRAINT "elearning_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_lessons" ADD CONSTRAINT "elearning_lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."elearning_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_blocks" ADD CONSTRAINT "elearning_blocks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."elearning_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_quizzes" ADD CONSTRAINT "elearning_quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."elearning_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_questions" ADD CONSTRAINT "elearning_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."elearning_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_attempts" ADD CONSTRAINT "elearning_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."elearning_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_attempts" ADD CONSTRAINT "elearning_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_enrollments" ADD CONSTRAINT "elearning_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_enrollments" ADD CONSTRAINT "elearning_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_progress" ADD CONSTRAINT "elearning_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."elearning_enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_certificates" ADD CONSTRAINT "elearning_certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_certificates" ADD CONSTRAINT "elearning_certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_certificates" ADD CONSTRAINT "elearning_certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."elearning_enrollments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_course_tags" ADD CONSTRAINT "elearning_course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_template_assets" ADD CONSTRAINT "elearning_template_assets_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."elearning_courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."elearning_template_assets" ADD CONSTRAINT "elearning_template_assets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."elearning_lessons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
