-- Create new enum for invitation status
CREATE TYPE "invitation_status" AS ENUM ('pending','accepted','declined','expired');

-- Rename member_role value admin to maintainer
ALTER TYPE "member_role" RENAME VALUE 'admin' TO 'maintainer';

-- Create project_invitations table
CREATE TABLE "project_invitations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "inviter_id" uuid NOT NULL,
  "invitee_id" uuid NOT NULL,
  "role" member_role NOT NULL DEFAULT 'member',
  "status" invitation_status NOT NULL DEFAULT 'pending',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "expires_at" timestamptz(6),
  CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "project_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "project_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Indexes
CREATE INDEX "idx_project_invite_project_invitee" ON "project_invitations"("project_id","invitee_id");

-- Unique pending invitation per user per project
CREATE UNIQUE INDEX "uq_project_invite_pending" ON "project_invitations"("project_id","invitee_id") WHERE status = 'pending';
