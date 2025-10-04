-- assistant_cache
DROP INDEX IF EXISTS hnsw_assistant_cache_query;

ALTER TABLE assistant_cache
  ALTER COLUMN query_embedding TYPE halfvec(1024)
  USING query_embedding::halfvec(1024);

CREATE INDEX hnsw_assistant_cache_query
  ON assistant_cache
  USING hnsw (query_embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- courses
DROP INDEX IF EXISTS hnsw_courses_embedding;

ALTER TABLE courses
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_courses_embedding
  ON courses
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- events
DROP INDEX IF EXISTS hnsw_events_embedding;

ALTER TABLE events
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_events_embedding
  ON events
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- interests
DROP INDEX IF EXISTS hnsw_interests_embedding;

ALTER TABLE interests
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_interests_embedding
  ON interests
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- lessons
DROP INDEX IF EXISTS hnsw_lessons_embedding;

ALTER TABLE lessons
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_lessons_embedding
  ON lessons
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- messages
DROP INDEX IF EXISTS hnsw_messages_embedding;

ALTER TABLE messages
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_messages_embedding
  ON messages
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- profiles
DROP INDEX IF EXISTS hnsw_profiles_embedding;

ALTER TABLE profiles
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_profiles_embedding
  ON profiles
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- projects
DROP INDEX IF EXISTS hnsw_projects_embedding;

ALTER TABLE projects
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_projects_embedding
  ON projects
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- resources
DROP INDEX IF EXISTS hnsw_resources_embedding;

ALTER TABLE resources
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_resources_embedding
  ON resources
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- skills
DROP INDEX IF EXISTS hnsw_skills_embedding;

ALTER TABLE skills
  ALTER COLUMN embedding TYPE halfvec(1024)
  USING embedding::halfvec(1024);

CREATE INDEX hnsw_skills_embedding
  ON skills
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);
