/*
  Warnings:

  - You are about to drop the `elearning_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_blocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_certificates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_course_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_lessons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_quizzes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elearning_template_assets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."elearning_attempts" DROP CONSTRAINT "elearning_attempts_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_attempts" DROP CONSTRAINT "elearning_attempts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_blocks" DROP CONSTRAINT "elearning_blocks_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_certificates" DROP CONSTRAINT "elearning_certificates_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_certificates" DROP CONSTRAINT "elearning_certificates_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_certificates" DROP CONSTRAINT "elearning_certificates_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_course_tags" DROP CONSTRAINT "elearning_course_tags_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_courses" DROP CONSTRAINT "elearning_courses_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_courses" DROP CONSTRAINT "elearning_courses_owner_org_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_courses" DROP CONSTRAINT "elearning_courses_prerequisite_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_enrollments" DROP CONSTRAINT "elearning_enrollments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_enrollments" DROP CONSTRAINT "elearning_enrollments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_lessons" DROP CONSTRAINT "elearning_lessons_section_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_progress" DROP CONSTRAINT "elearning_progress_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_questions" DROP CONSTRAINT "elearning_questions_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_quizzes" DROP CONSTRAINT "elearning_quizzes_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_sections" DROP CONSTRAINT "elearning_sections_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_template_assets" DROP CONSTRAINT "elearning_template_assets_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."elearning_template_assets" DROP CONSTRAINT "elearning_template_assets_lesson_id_fkey";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "pending_email" CITEXT;

-- DropTable
DROP TABLE "public"."elearning_attempts";

-- DropTable
DROP TABLE "public"."elearning_blocks";

-- DropTable
DROP TABLE "public"."elearning_certificates";

-- DropTable
DROP TABLE "public"."elearning_course_tags";

-- DropTable
DROP TABLE "public"."elearning_courses";

-- DropTable
DROP TABLE "public"."elearning_enrollments";

-- DropTable
DROP TABLE "public"."elearning_lessons";

-- DropTable
DROP TABLE "public"."elearning_progress";

-- DropTable
DROP TABLE "public"."elearning_questions";

-- DropTable
DROP TABLE "public"."elearning_quizzes";

-- DropTable
DROP TABLE "public"."elearning_sections";

-- DropTable
DROP TABLE "public"."elearning_template_assets";

-- DropEnum
DROP TYPE "public"."elearning_block_kind";

-- DropEnum
DROP TYPE "public"."elearning_course_level";

-- DropEnum
DROP TYPE "public"."elearning_course_visibility";

-- DropEnum
DROP TYPE "public"."elearning_enrollment_status";

-- DropEnum
DROP TYPE "public"."elearning_publish_status";

-- DropEnum
DROP TYPE "public"."elearning_question_type";

-- CreateTable
CREATE TABLE "public"."email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_security_settings" (
    "user_id" UUID NOT NULL,
    "totp_secret_encrypted" TEXT,
    "totp_secret_iv" TEXT,
    "totp_secret_tag" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."user_totp_backup_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_totp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_verification_user" ON "public"."email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_email_verification_email" ON "public"."email_verification_tokens"("email");

-- CreateIndex
CREATE INDEX "idx_user_totp_codes_user" ON "public"."user_totp_backup_codes"("user_id");

-- AddForeignKey
ALTER TABLE "public"."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_totp_backup_codes" ADD CONSTRAINT "user_totp_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_security_settings"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
