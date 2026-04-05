-- CreateTable
CREATE TABLE "public"."assistant_project_ideation_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cache_key" TEXT NOT NULL,
    "language" VARCHAR(8) NOT NULL,
    "step" VARCHAR(32) NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_project_ideation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assistant_project_ideation_user_created" ON "public"."assistant_project_ideation_runs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assistant_project_ideation_cache" ON "public"."assistant_project_ideation_runs"("user_id", "cache_key");

-- AddForeignKey
ALTER TABLE "public"."assistant_project_ideation_runs" ADD CONSTRAINT "assistant_project_ideation_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
