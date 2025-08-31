-- AlterEnum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'canceled';

-- AlterTable
ALTER TABLE "project_applications"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- DropIndex
DROP INDEX IF EXISTS "uq_project_app_once";

-- CreateIndex (cast enum)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_project_app_pending"
ON "project_applications"("project_id", "applicant_id")
WHERE status = 'pending'::application_status;

-- Ensure trigger function exists (si pas déjà créée ailleurs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END$$;

-- CreateTrigger (sans IF NOT EXISTS, via bloc conditionnel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_project_applications_updated_at'
  ) THEN
    CREATE TRIGGER "trg_project_applications_updated_at"
    BEFORE UPDATE ON "project_applications"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;
