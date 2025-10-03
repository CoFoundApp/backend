-- CreateEnum
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE "public"."application_status" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn', 'canceled');

-- CreateEnum
CREATE TYPE "public"."asset_type" AS ENUM ('file', 'image', 'video', 'link');

-- CreateEnum
CREATE TYPE "public"."challenge_status" AS ENUM ('upcoming', 'active', 'ended');

-- CreateEnum
CREATE TYPE "public"."conversation_type" AS ENUM ('dm', 'group', 'project');

-- CreateEnum
CREATE TYPE "public"."course_level" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "public"."enrollment_status" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."invoice_status" AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');

-- CreateEnum
CREATE TYPE "public"."job_status" AS ENUM ('queued', 'processing', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "public"."lesson_progress_status" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."location_type" AS ENUM ('online', 'offline', 'hybrid');

-- CreateEnum
CREATE TYPE "public"."invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "public"."member_role" AS ENUM ('owner', 'maintainer', 'member', 'mentor');

-- CreateEnum
CREATE TYPE "public"."member_status" AS ENUM ('invited', 'active', 'left', 'removed');

-- CreateEnum
CREATE TYPE "public"."message_type" AS ENUM ('text', 'system', 'file', 'event');

-- CreateEnum
CREATE TYPE "public"."notification_type" AS ENUM ('application_submitted', 'application_accepted', 'application_rejected', 'application_canceled', 'application_withdrawn', 'invitation_sent', 'invitation_accepted', 'invitation_declined', 'member_removed', 'member_left', 'project_position_opened', 'project_updated', 'new_message');

-- CreateEnum
CREATE TYPE "public"."email_frequency" AS ENUM ('immediate', 'digest_daily', 'digest_weekly', 'off');

-- CreateEnum
CREATE TYPE "public"."plan_interval" AS ENUM ('month', 'year');

-- CreateEnum
CREATE TYPE "public"."points_source_type" AS ENUM ('action', 'challenge', 'bonus', 'manual');

-- CreateEnum
CREATE TYPE "public"."project_stage" AS ENUM ('idea', 'mvp', 'traction', 'scale');

-- CreateEnum
CREATE TYPE "public"."project_status" AS ENUM ('draft', 'seeking', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "public"."question_type" AS ENUM ('single', 'multiple', 'text');

-- CreateEnum
CREATE TYPE "public"."registration_status" AS ENUM ('registered', 'waitlist', 'cancelled', 'attended', 'no_show');

-- CreateEnum
CREATE TYPE "public"."reset_interval" AS ENUM ('day', 'month', 'year', 'never');

-- CreateEnum
CREATE TYPE "public"."storage_provider" AS ENUM ('s3', 'gcs', 'azure', 'local');

-- CreateEnum
CREATE TYPE "public"."subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "public"."target_type" AS ENUM ('user', 'project', 'course', 'resource', 'message', 'event');

-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('user', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "public"."user_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "public"."visibility" AS ENUM ('private', 'unlisted', 'public');

-- CreateEnum
CREATE TYPE "public"."position_status" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "public"."agg_daily_metrics" (
    "day" DATE NOT NULL,
    "dau" INTEGER,
    "new_users" INTEGER,
    "messages_sent" INTEGER,
    "projects_created" INTEGER,
    "revenue_cents" BIGINT,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agg_daily_metrics_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "public"."assistant_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cache_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "query_embedding" vector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assistant_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "conversation_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "assistant_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" CITEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "processing_error" TEXT,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."challenge_status" NOT NULL DEFAULT 'upcoming',
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "points_reward" INTEGER,
    "rules" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_members" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "public"."conversation_type" NOT NULL DEFAULT 'group',
    "project_id" UUID,
    "title" TEXT,
    "created_by" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),
    "messages_count" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_id" UUID,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "public"."course_level" NOT NULL DEFAULT 'beginner',
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "visibility" "public"."visibility" NOT NULL DEFAULT 'public',
    "embedding" vector,
    "search_tsv" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "public"."enrollment_status" NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "feature_code" CITEXT NOT NULL,
    "limit_value" INTEGER,
    "used_value" INTEGER NOT NULL DEFAULT 0,
    "reset_every" "public"."reset_interval" NOT NULL DEFAULT 'month',
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "public"."registration_status" NOT NULL DEFAULT 'registered',
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended" BOOLEAN,
    "attendance_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "speaker_id" UUID,
    "speaker_name" TEXT,
    "room" TEXT,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "location_kind" "public"."location_type" NOT NULL DEFAULT 'online',
    "location_text" TEXT,
    "meeting_url" TEXT,
    "capacity" INTEGER,
    "visibility" "public"."visibility" NOT NULL DEFAULT 'public',
    "embedding" vector,
    "search_tsv" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."financial_metrics" (
    "day" DATE NOT NULL,
    "mrr_cents" BIGINT,
    "arr_cents" BIGINT,
    "arpu_cents" BIGINT,
    "churn_rate" DECIMAL(6,4),
    "new_mrr_cents" BIGINT,
    "expansion_mrr_cents" BIGINT,
    "contraction_mrr_cents" BIGINT,

    CONSTRAINT "financial_metrics_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "public"."interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" CITEXT NOT NULL,
    "category" TEXT,
    "slug" CITEXT,
    "embedding" vector,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "public"."invoice_status" NOT NULL DEFAULT 'open',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "external_invoice_id" TEXT,
    "pdf_url" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "queue" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" "public"."job_status" NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "run_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "type" "public"."asset_type" NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content_md" TEXT,
    "video_url" TEXT,
    "duration_seconds" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 1,
    "embedding" vector,
    "search_tsv" tsvector,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" INTEGER,
    "checksum" TEXT,
    "storage" "public"."storage_provider" NOT NULL DEFAULT 's3',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "type" "public"."message_type" NOT NULL DEFAULT 'text',
    "content" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "reply_to_id" UUID,
    "embedding" vector,
    "search_tsv" tsvector,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "subject_id" UUID,
    "actor_id" UUID,
    "project_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "channels" TEXT[],
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "emailed_at" TIMESTAMPTZ(6),
    "digest_key" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "user_id" UUID NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "site_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_frequency" "public"."email_frequency" NOT NULL DEFAULT 'immediate',
    "quiet_hours_start" TIME(6),
    "quiet_hours_end" TIME(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id","type")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "locale" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "interval" "public"."plan_interval" NOT NULL DEFAULT 'month',
    "features" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."points_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "delta_points" INTEGER NOT NULL,
    "source_type" "public"."points_source_type" NOT NULL,
    "source_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."privacy_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website_url" TEXT,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "looking_for" TEXT,
    "availability_hours" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector,
    "embedding_text_hash" TEXT,
    "embedding_at" TIMESTAMPTZ(6),
    "embedding_model" TEXT,
    "embedding_dim" SMALLINT,
    "visibility" "public"."visibility" NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."educations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."volunteer_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "cause" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" "public"."lesson_progress_status" NOT NULL DEFAULT 'not_started',
    "current_pos_sec" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "position_id" UUID,
    "applicant_id" UUID NOT NULL,
    "message" TEXT,
    "note" TEXT,
    "availability" SMALLINT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."application_status" NOT NULL DEFAULT 'pending',
    "decision_reason" TEXT,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "public"."member_role" NOT NULL DEFAULT 'member',
    "status" "public"."member_status" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "public"."project_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "inviter_id" UUID NOT NULL,
    "invitee_id" UUID NOT NULL,
    "role" "public"."member_role" NOT NULL DEFAULT 'member',
    "status" "public"."invitation_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_metrics" (
    "project_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "members_count" INTEGER,
    "messages_count" INTEGER,
    "applications_count" INTEGER,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "project_metrics_pkey" PRIMARY KEY ("project_id","day")
);

-- CreateTable
CREATE TABLE "public"."project_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."position_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."project_status" NOT NULL DEFAULT 'draft',
    "stage" "public"."project_stage" NOT NULL DEFAULT 'idea',
    "visibility" "public"."visibility" NOT NULL DEFAULT 'public',
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "banner_url" TEXT,
    "avatar_url" TEXT,
    "embedding" vector,
    "search_tsv" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "answers" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "type" "public"."question_type" NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID,
    "lesson_id" UUID,
    "title" TEXT NOT NULL,
    "time_limit_sec" INTEGER,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recommendation_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" "public"."target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "public"."visibility" NOT NULL DEFAULT 'public',
    "embedding" vector,
    "search_tsv" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" CITEXT NOT NULL,
    "category" TEXT,
    "slug" CITEXT,
    "embedding" vector,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "public"."subscription_status" NOT NULL DEFAULT 'active',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),
    "external_customer_id" TEXT,
    "external_subscription_id" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."track_events" (
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "event_name" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "context" JSONB NOT NULL DEFAULT '{}',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_events_pkey" PRIMARY KEY ("occurred_at","id")
);

-- CreateTable
CREATE TABLE "public"."user_badges" (
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateTable
CREATE TABLE "public"."user_interests" (
    "user_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id","interest_id")
);

-- CreateTable
CREATE TABLE "public"."user_skills" (
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "level" SMALLINT,
    "years" SMALLINT,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("user_id","skill_id")
);

-- CreateTable
CREATE TABLE "public"."project_skills" (
    "project_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "importance" SMALLINT,

    CONSTRAINT "project_skills_pkey" PRIMARY KEY ("project_id","skill_id")
);

-- CreateTable
CREATE TABLE "public"."project_interests" (
    "project_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,

    CONSTRAINT "project_interests_pkey" PRIMARY KEY ("project_id","interest_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."user_role" NOT NULL DEFAULT 'user',
    "status" "public"."user_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_cache_cache_key_key" ON "public"."assistant_cache"("cache_key");

-- CreateIndex
CREATE INDEX "hnsw_assistant_cache_query" ON "public"."assistant_cache"("query_embedding");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "public"."audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "public"."audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_auth_identities_user" ON "public"."auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_key" ON "public"."auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "public"."badges"("code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_event_id_key" ON "public"."billing_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_conv_members_user" ON "public"."conversation_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_last_message_id_key" ON "public"."conversations"("last_message_id");

-- CreateIndex
CREATE INDEX "idx_conversations_project" ON "public"."conversations"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_course_module_position" ON "public"."course_modules"("course_id", "position");

-- CreateIndex
CREATE INDEX "hnsw_courses_embedding" ON "public"."courses"("embedding");

-- CreateIndex
CREATE INDEX "idx_courses_author" ON "public"."courses"("author_id");

-- CreateIndex
CREATE INDEX "idx_courses_fts" ON "public"."courses" USING GIN ("search_tsv");

-- CreateIndex
CREATE UNIQUE INDEX "uq_enrollment_once" ON "public"."enrollments"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_entitlement_feature" ON "public"."entitlements"("subscription_id", "feature_code");

-- CreateIndex
CREATE INDEX "idx_event_registrations_user" ON "public"."event_registrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_event_registration_once" ON "public"."event_registrations"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_event_sessions_event" ON "public"."event_sessions"("event_id");

-- CreateIndex
CREATE INDEX "hnsw_events_embedding" ON "public"."events"("embedding");

-- CreateIndex
CREATE INDEX "idx_events_fts" ON "public"."events" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "idx_events_org" ON "public"."events"("organizer_id");

-- CreateIndex
CREATE INDEX "idx_events_time" ON "public"."events"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "interests_name_key" ON "public"."interests"("name");

-- CreateIndex
CREATE UNIQUE INDEX "interests_slug_key" ON "public"."interests"("slug");

-- CreateIndex
CREATE INDEX "hnsw_interests_embedding" ON "public"."interests"("embedding");

-- CreateIndex
CREATE INDEX "idx_invoices_subscription" ON "public"."invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_jobs_queue_status" ON "public"."jobs"("queue", "status", "run_at");

-- CreateIndex
CREATE INDEX "idx_lesson_assets_lesson" ON "public"."lesson_assets"("lesson_id");

-- CreateIndex
CREATE INDEX "hnsw_lessons_embedding" ON "public"."lessons"("embedding");

-- CreateIndex
CREATE INDEX "idx_lessons_fts" ON "public"."lessons" USING GIN ("search_tsv");

-- CreateIndex
CREATE UNIQUE INDEX "uq_lesson_position" ON "public"."lessons"("module_id", "position");

-- CreateIndex
CREATE INDEX "idx_msg_attachments_msg" ON "public"."message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "hnsw_messages_embedding" ON "public"."messages"("embedding");

-- CreateIndex
CREATE INDEX "idx_messages_conv_time" ON "public"."messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_messages_fts" ON "public"."messages" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "public"."messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "public"."notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_notifications_user_created" ON "public"."notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "public"."email_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_topic_aggregate_type_aggregate_id_created_at_key" ON "public"."outbox_events"("topic", "aggregate_type", "aggregate_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "public"."plans"("code");

-- CreateIndex
CREATE INDEX "idx_points_ledger_user" ON "public"."points_ledger"("user_id");

-- CreateIndex
CREATE INDEX "idx_privacy_consents_user" ON "public"."privacy_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "hnsw_profiles_embedding" ON "public"."profiles"("embedding");

-- CreateIndex
CREATE INDEX "work_experiences_user_id_idx" ON "public"."work_experiences"("user_id");

-- CreateIndex
CREATE INDEX "educations_user_id_idx" ON "public"."educations"("user_id");

-- CreateIndex
CREATE INDEX "volunteer_experiences_user_id_idx" ON "public"."volunteer_experiences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_progress_once" ON "public"."progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_project_app_project_applicant" ON "public"."project_applications"("project_id", "applicant_id");

-- CreateIndex
CREATE INDEX "idx_project_applications_position" ON "public"."project_applications"("position_id");

-- CreateIndex
CREATE INDEX "idx_project_members_user" ON "public"."project_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_project_invite_project_invitee" ON "public"."project_invitations"("project_id", "invitee_id");

-- CreateIndex
CREATE INDEX "idx_project_positions_project" ON "public"."project_positions"("project_id");

-- CreateIndex
CREATE INDEX "hnsw_projects_embedding" ON "public"."projects"("embedding");

-- CreateIndex
CREATE INDEX "idx_projects_fts" ON "public"."projects" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "idx_projects_owner" ON "public"."projects"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_quiz_attempt_once" ON "public"."quiz_attempts"("quiz_id", "user_id", "started_at");

-- CreateIndex
CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_quizzes_course" ON "public"."quizzes"("course_id");

-- CreateIndex
CREATE INDEX "idx_quizzes_lesson" ON "public"."quizzes"("lesson_id");

-- CreateIndex
CREATE INDEX "idx_rec_feedback_target" ON "public"."recommendation_feedback"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_rec_feedback_user" ON "public"."recommendation_feedback"("user_id");

-- CreateIndex
CREATE INDEX "hnsw_resources_embedding" ON "public"."resources"("embedding");

-- CreateIndex
CREATE INDEX "idx_resources_author" ON "public"."resources"("author_id");

-- CreateIndex
CREATE INDEX "idx_resources_fts" ON "public"."resources" USING GIN ("search_tsv");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "public"."skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "public"."skills"("slug");

-- CreateIndex
CREATE INDEX "hnsw_skills_embedding" ON "public"."skills"("embedding");

-- CreateIndex
CREATE INDEX "idx_user_interests_interest" ON "public"."user_interests"("interest_id");

-- CreateIndex
CREATE INDEX "idx_user_skills_skill" ON "public"."user_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_project_skills_skill" ON "public"."project_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_project_interests_interest" ON "public"."project_interests"("interest_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."assistant_sessions" ADD CONSTRAINT "assistant_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."assistant_sessions" ADD CONSTRAINT "assistant_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."event_sessions" ADD CONSTRAINT "event_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."event_sessions" ADD CONSTRAINT "event_sessions_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."lesson_assets" ADD CONSTRAINT "lesson_assets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."points_ledger" ADD CONSTRAINT "points_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."privacy_consents" ADD CONSTRAINT "privacy_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."educations" ADD CONSTRAINT "educations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_experiences" ADD CONSTRAINT "volunteer_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."progress" ADD CONSTRAINT "progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_applications" ADD CONSTRAINT "project_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_applications" ADD CONSTRAINT "project_applications_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_applications" ADD CONSTRAINT "project_applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_applications" ADD CONSTRAINT "project_applications_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."project_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_invitations" ADD CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_invitations" ADD CONSTRAINT "project_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_invitations" ADD CONSTRAINT "project_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_metrics" ADD CONSTRAINT "project_metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_positions" ADD CONSTRAINT "project_positions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resources" ADD CONSTRAINT "resources_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."track_events" ADD CONSTRAINT "track_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_interests" ADD CONSTRAINT "user_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_skills" ADD CONSTRAINT "project_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_skills" ADD CONSTRAINT "project_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_interests" ADD CONSTRAINT "project_interests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."project_interests" ADD CONSTRAINT "project_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
