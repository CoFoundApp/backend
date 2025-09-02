-- Drop existing notifications and type, recreate with new structure
DROP TABLE IF EXISTS "notifications";
DROP TYPE IF EXISTS "notification_type";

CREATE TYPE "notification_type" AS ENUM (
  'application_submitted',
  'application_accepted',
  'application_rejected',
  'application_canceled',
  'application_withdrawn',
  'invitation_sent',
  'invitation_accepted',
  'invitation_declined',
  'member_removed',
  'member_left',
  'project_position_opened',
  'project_updated'
);

CREATE TYPE "email_frequency" AS ENUM ('immediate','digest_daily','digest_weekly','off');

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "type" notification_type NOT NULL,
  "subject_id" UUID,
  "actor_id" UUID,
  "project_id" UUID,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "emailed_at" TIMESTAMPTZ,
  "digest_key" TEXT,
  "idempotency_key" TEXT UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC);
CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read", "created_at" DESC);

CREATE TABLE "notification_preferences" (
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "type" notification_type NOT NULL,
  "site_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "email_frequency" email_frequency NOT NULL DEFAULT 'immediate',
  "quiet_hours_start" TIME,
  "quiet_hours_end" TIME,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "type")
);

CREATE TABLE "email_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "text" TEXT,
  "locale" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
