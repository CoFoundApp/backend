CREATE TABLE "project_skills" (
  "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "skill_id" UUID NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
  "importance" SMALLINT CHECK ("importance" BETWEEN 0 AND 10),
  PRIMARY KEY ("project_id", "skill_id")
);
CREATE INDEX "idx_project_skills_skill" ON "project_skills"("skill_id");

CREATE TABLE "project_interests" (
  "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "interest_id" UUID NOT NULL REFERENCES "interests"("id") ON DELETE CASCADE,
  PRIMARY KEY ("project_id", "interest_id")
);
CREATE INDEX "idx_project_interests_interest" ON "project_interests"("interest_id");
