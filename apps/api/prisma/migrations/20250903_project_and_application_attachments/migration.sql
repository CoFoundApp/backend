ALTER TABLE "projects"
  ADD COLUMN "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "banner_url" TEXT,
  ADD COLUMN "avatar_url" TEXT;

ALTER TABLE "project_applications"
  ADD COLUMN "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
