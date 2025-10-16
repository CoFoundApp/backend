-- CreateEnum
CREATE TYPE "public"."work_style" AS ENUM ('autonomous', 'collaborative', 'structured', 'agile');

-- CreateEnum
CREATE TYPE "public"."core_value" AS ENUM ('innovation', 'stability', 'social_impact', 'growth');

-- CreateEnum
CREATE TYPE "public"."motivation" AS ENUM ('learn', 'earn', 'create', 'help');

-- CreateEnum
CREATE TYPE "public"."environment_preference" AS ENUM ('startup', 'scaleup', 'enterprise', 'solo');

-- CreateEnum
CREATE TYPE "public"."team_role" AS ENUM ('leader', 'contributor', 'mentor', 'learner');

-- CreateEnum
CREATE TYPE "public"."communication_style" AS ENUM ('direct', 'diplomatic', 'formal', 'casual');

-- CreateEnum
CREATE TYPE "public"."communication_frequency" AS ENUM ('daily', 'weekly', 'biweekly', 'async');

-- CreateEnum
CREATE TYPE "public"."team_size_preference" AS ENUM ('small', 'medium', 'large', 'flexible');

-- CreateEnum
CREATE TYPE "public"."management_style" AS ENUM ('hands_on', 'hands_off', 'coaching', 'self_managed');

-- CreateEnum
CREATE TYPE "public"."collaboration_mode" AS ENUM ('synchronous', 'asynchronous', 'hybrid');

-- CreateEnum
CREATE TYPE "public"."urgency_level" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "public"."match_entity_type" AS ENUM ('profile', 'project');

-- CreateEnum
CREATE TYPE "public"."match_status" AS ENUM ('unknown', 'viewed', 'applied', 'interviewing', 'hired', 'completed', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "activity_score" DOUBLE PRECISION,
ADD COLUMN     "availability_time_slots" JSONB DEFAULT '[]',
ADD COLUMN     "average_rating" DOUBLE PRECISION,
ADD COLUMN     "average_response_time_minutes" INTEGER,
ADD COLUMN     "communication_frequency" "public"."communication_frequency",
ADD COLUMN     "communication_style" "public"."communication_style",
ADD COLUMN     "core_values" "public"."core_value"[] DEFAULT ARRAY[]::"public"."core_value"[],
ADD COLUMN     "desired_team_role" "public"."team_role",
ADD COLUMN     "last_active_at" TIMESTAMPTZ(6),
ADD COLUMN     "mission_duration_max_weeks" SMALLINT,
ADD COLUMN     "mission_duration_min_weeks" SMALLINT,
ADD COLUMN     "preferred_collaboration_mode" "public"."collaboration_mode",
ADD COLUMN     "preferred_environments" "public"."environment_preference"[] DEFAULT ARRAY[]::"public"."environment_preference"[],
ADD COLUMN     "preferred_team_size" "public"."team_size_preference",
ADD COLUMN     "preferred_work_styles" "public"."work_style"[] DEFAULT ARRAY[]::"public"."work_style"[],
ADD COLUMN     "primary_motivations" "public"."motivation"[] DEFAULT ARRAY[]::"public"."motivation"[],
ADD COLUMN     "remote_preference_percent" SMALLINT,
ADD COLUMN     "success_rate" DOUBLE PRECISION,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "timezone_flexibility_minutes" SMALLINT;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "acceptance_rate" DOUBLE PRECISION,
ADD COLUMN     "average_project_rating" DOUBLE PRECISION,
ADD COLUMN     "average_response_time_minutes" INTEGER,
ADD COLUMN     "collaboration_mode" "public"."collaboration_mode",
ADD COLUMN     "communication_frequency" "public"."communication_frequency",
ADD COLUMN     "communication_style" "public"."communication_style",
ADD COLUMN     "critical_time_slots" JSONB DEFAULT '[]',
ADD COLUMN     "culture_values" "public"."core_value"[] DEFAULT ARRAY[]::"public"."core_value"[],
ADD COLUMN     "culture_work_styles" "public"."work_style"[] DEFAULT ARRAY[]::"public"."work_style"[],
ADD COLUMN     "duration_weeks_max" SMALLINT,
ADD COLUMN     "duration_weeks_min" SMALLINT,
ADD COLUMN     "environment" "public"."environment_preference",
ADD COLUMN     "management_style" "public"."management_style",
ADD COLUMN     "preferred_team_role" "public"."team_role",
ADD COLUMN     "preferred_team_size" "public"."team_size_preference",
ADD COLUMN     "remote_ratio_max" SMALLINT,
ADD COLUMN     "remote_ratio_min" SMALLINT,
ADD COLUMN     "required_hours_max" SMALLINT,
ADD COLUMN     "required_hours_min" SMALLINT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "urgency" "public"."urgency_level";

-- CreateTable
CREATE TABLE "public"."match_explanations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "project_id" UUID,
    "counterpart_profile_id" UUID,
    "counterpart_project_id" UUID,
    "entity_type" "public"."match_entity_type" NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "detail_level" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "chemistry_score" DOUBLE PRECISION,
    "success_probability" DOUBLE PRECISION,
    "success_confidence" DOUBLE PRECISION,
    "success_model_version" TEXT,
    "dimension_scores" JSONB NOT NULL DEFAULT '{}',
    "forces" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "contact_plan" JSONB NOT NULL DEFAULT '[]',
    "competitive_context" JSONB NOT NULL DEFAULT '{}',
    "bidirectional_context" JSONB NOT NULL DEFAULT '{}',
    "debug_trace" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_outcomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_explanation_id" UUID,
    "profile_id" UUID,
    "project_id" UUID,
    "status" "public"."match_status" NOT NULL DEFAULT 'unknown',
    "rejection_reason" TEXT,
    "success_notes" JSONB DEFAULT '{}',
    "profile_feedback" JSONB DEFAULT '{}',
    "project_feedback" JSONB DEFAULT '{}',
    "viewed_at" TIMESTAMPTZ(6),
    "applied_at" TIMESTAMPTZ(6),
    "interviewed_at" TIMESTAMPTZ(6),
    "hired_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."algorithm_weights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sector" TEXT,
    "project_type" TEXT,
    "urgency" "public"."urgency_level",
    "dimension_technical" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimension_culture" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimension_team" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimension_logistics" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimension_experience" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimension_semantic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "sample_size" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matching_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "feature_names" TEXT[],
    "coefficients" JSONB NOT NULL DEFAULT '[]',
    "bias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "trained_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "training_metrics" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_match_expl_profile" ON "public"."match_explanations"("profile_id");

-- CreateIndex
CREATE INDEX "idx_match_expl_project" ON "public"."match_explanations"("project_id");

-- CreateIndex
CREATE INDEX "idx_match_expl_entity_level" ON "public"."match_explanations"("entity_type", "detail_level");

-- CreateIndex
CREATE INDEX "idx_match_expl_counter_profile" ON "public"."match_explanations"("counterpart_profile_id");

-- CreateIndex
CREATE INDEX "idx_match_expl_counter_project" ON "public"."match_explanations"("counterpart_project_id");

-- CreateIndex
CREATE INDEX "idx_match_outcome_profile" ON "public"."match_outcomes"("profile_id");

-- CreateIndex
CREATE INDEX "idx_match_outcome_project" ON "public"."match_outcomes"("project_id");

-- CreateIndex
CREATE INDEX "idx_match_outcome_expl" ON "public"."match_outcomes"("match_explanation_id");

-- CreateIndex
CREATE INDEX "idx_algo_weights_context" ON "public"."algorithm_weights"("sector", "project_type", "urgency");

-- CreateIndex
CREATE INDEX "idx_matching_models_active" ON "public"."matching_models"("model_type", "is_active", "trained_at");

-- AddForeignKey
ALTER TABLE "public"."match_explanations" ADD CONSTRAINT "match_explanations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_explanations" ADD CONSTRAINT "match_explanations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_explanations" ADD CONSTRAINT "match_explanations_counterpart_profile_id_fkey" FOREIGN KEY ("counterpart_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_explanations" ADD CONSTRAINT "match_explanations_counterpart_project_id_fkey" FOREIGN KEY ("counterpart_project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_match_explanation_id_fkey" FOREIGN KEY ("match_explanation_id") REFERENCES "public"."match_explanations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
