ALTER TABLE "project_applications" RENAME COLUMN "note" TO "message";

ALTER TABLE "project_applications"
  ADD COLUMN "role" TEXT,
  ADD COLUMN "availability" SMALLINT,
  ADD COLUMN "links" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "decision_reason" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now();

ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'canceled';
