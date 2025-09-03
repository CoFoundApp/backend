DO $$
BEGIN
  CREATE TYPE "conversation_type" AS ENUM ('dm', 'group', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'new_message';
ALTER TYPE "target_type" ADD VALUE IF NOT EXISTS 'message';

-- Conversations table
CREATE TABLE "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" conversation_type NOT NULL DEFAULT 'group',
  "project_id" UUID,
  "title" TEXT,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "last_message_at" TIMESTAMPTZ,
  "messages_count" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_message_id" UUID UNIQUE,
  CONSTRAINT "conversations_last_message_fk" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_conversations_project" ON "conversations" ("project_id");

-- Participants table
CREATE TABLE "conversation_members" (
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_read_at" TIMESTAMPTZ,
  PRIMARY KEY ("conversation_id", "user_id")
);
CREATE INDEX "idx_conv_members_user" ON "conversation_members" ("user_id");

-- Messages additions
ALTER TABLE "messages"
  ADD COLUMN "conversation_id" UUID,
  ADD COLUMN "sender_id" UUID,
  ADD COLUMN "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "reply_to_id" UUID;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "messages_sender_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id"),
  ADD CONSTRAINT "messages_reply_fk" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL;

CREATE INDEX "idx_messages_conv_time" ON "messages" ("conversation_id", "created_at");
CREATE INDEX "idx_messages_sender" ON "messages" ("sender_id");
