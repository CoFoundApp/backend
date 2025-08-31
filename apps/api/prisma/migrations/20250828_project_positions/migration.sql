-- CreateEnum
CREATE TYPE position_status AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "project_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" position_status NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "project_positions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_positions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX "idx_project_positions_project" ON "project_positions"("project_id");

-- AddColumn
ALTER TABLE "project_applications" ADD COLUMN "position_id" UUID REFERENCES "project_positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- CreateIndex
CREATE INDEX "idx_project_applications_position" ON "project_applications"("position_id");

-- Trigger for updated_at
CREATE TRIGGER "trg_project_positions_updated_at" BEFORE UPDATE ON "project_positions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
