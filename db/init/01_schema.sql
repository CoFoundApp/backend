-- =============================================================================
-- CoFound — PostgreSQL schema (UUID + pgvector + FTS + partitions + RLS)
-- Requires: PostgreSQL 14+ | pgvector 0.6+ | pgcrypto | citext
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (HNSW)
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive text

-- -----------------------------------------------------------------------------
-- Helper functions (timestamps / session identity / FTS / partitions)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;

-- Propagate user identity via GUCs: app.user_id (uuid), app.role ('user'|'moderator'|'admin')
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.role', true) IN ('admin','moderator')
$$;

-- Generic FTS updater (uses 'simple' config for portability; change if you prefer 'french')
CREATE OR REPLACE FUNCTION tsv_update_simple(IN text_in TEXT) RETURNS tsvector
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_tsvector('simple', coalesce(text_in,''))
$$;

-- Partition helper for track_events (monthly)
CREATE OR REPLACE FUNCTION ensure_track_events_partition_for(p_date date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  part_start date := date_trunc('month', p_date)::date;
  part_end   date := (date_trunc('month', p_date) + interval '1 month')::date;
  part_name  text := format('track_events_%s', to_char(part_start, 'YYYY_MM'));
  sql        text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='r' AND n.nspname = current_schema() AND c.relname = part_name
  ) THEN
    sql := format($f$
      CREATE TABLE %I PARTITION OF track_events
      FOR VALUES FROM (%L) TO (%L);
      CREATE INDEX IF NOT EXISTS idx_%I_name_time ON %I(event_name, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_%I_user_time ON %I(user_id, occurred_at);
    $f$, part_name, part_start, part_end, part_name, part_name, part_name, part_name);
    EXECUTE sql;
  END IF;
END$$;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role')       THEN CREATE TYPE user_role AS ENUM ('user','moderator','admin'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status')     THEN CREATE TYPE user_status AS ENUM ('active','suspended','deleted'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility')      THEN CREATE TYPE visibility AS ENUM ('private','unlisted','public'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status')  THEN CREATE TYPE project_status AS ENUM ('draft','seeking','active','paused','archived'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_stage')   THEN CREATE TYPE project_stage AS ENUM ('idea','mvp','traction','scale'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role')     THEN CREATE TYPE member_role AS ENUM ('owner','admin','member','mentor'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status')   THEN CREATE TYPE member_status AS ENUM ('invited','active','left','removed'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN CREATE TYPE application_status AS ENUM ('pending','accepted','rejected','withdrawn'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN CREATE TYPE conversation_type AS ENUM ('dm','group','project'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type')    THEN CREATE TYPE message_type AS ENUM ('text','system','file','event'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider') THEN CREATE TYPE storage_provider AS ENUM ('s3','gcs','azure','local'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type')   THEN CREATE TYPE location_type AS ENUM ('online','offline','hybrid'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN CREATE TYPE registration_status AS ENUM ('registered','waitlist','cancelled','attended','no_show'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level')    THEN CREATE TYPE course_level AS ENUM ('beginner','intermediate','advanced'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type')      THEN CREATE TYPE asset_type AS ENUM ('file','image','video','link'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type')   THEN CREATE TYPE question_type AS ENUM ('single','multiple','text'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN CREATE TYPE enrollment_status AS ENUM ('active','completed','cancelled'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_progress_status') THEN CREATE TYPE lesson_progress_status AS ENUM ('not_started','in_progress','completed'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_type')     THEN CREATE TYPE target_type AS ENUM ('user','project','course','resource','message','event'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'points_source_type') THEN CREATE TYPE points_source_type AS ENUM ('action','challenge','bonus','manual'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_status') THEN CREATE TYPE challenge_status AS ENUM ('upcoming','active','ended'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_interval')   THEN CREATE TYPE plan_interval AS ENUM ('month','year'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status')  THEN CREATE TYPE invoice_status AS ENUM ('draft','open','paid','void','uncollectible'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reset_interval')  THEN CREATE TYPE reset_interval AS ENUM ('day','month','year','never'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('system','message','project_invite','application_update','event_update','learning');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status')      THEN CREATE TYPE job_status AS ENUM ('queued','processing','completed','failed','canceled'); END IF;
END$$;

-- =============================================================================
-- USERS & PRIVACY
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              CITEXT UNIQUE NOT NULL,
  password_hash      TEXT NOT NULL,
  role               user_role NOT NULL DEFAULT 'user',
  status             user_status NOT NULL DEFAULT 'active',
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS privacy_consents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type       TEXT NOT NULL,
  granted            BOOLEAN NOT NULL,
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address         INET,
  user_agent         TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user ON privacy_consents(user_id);

-- =============================================================================
-- PROFILES / SKILLS / INTERESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name       TEXT,
  headline           TEXT,
  bio                TEXT,
  location           TEXT,
  languages          TEXT[] DEFAULT '{}',
  website_url        TEXT,
  avatar_url         TEXT,
  banner_url         TEXT,
  looking_for        TEXT,
  availability_hours INT,
  tags               TEXT[] DEFAULT '{}',
  embedding          VECTOR(1536),
  visibility         visibility NOT NULL DEFAULT 'public',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hnsw_profiles_embedding ON profiles USING hnsw (embedding vector_l2_ops);
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS skills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               CITEXT NOT NULL UNIQUE,
  category           TEXT,
  slug               CITEXT UNIQUE,
  embedding          VECTOR(1536)
);
CREATE INDEX IF NOT EXISTS hnsw_skills_embedding ON skills USING hnsw (embedding vector_l2_ops);

CREATE TABLE IF NOT EXISTS interests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               CITEXT NOT NULL UNIQUE,
  category           TEXT,
  slug               CITEXT UNIQUE,
  embedding          VECTOR(1536)
);
CREATE INDEX IF NOT EXISTS hnsw_interests_embedding ON interests USING hnsw (embedding vector_l2_ops);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id           UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level              SMALLINT CHECK (level BETWEEN 0 AND 10),
  years              SMALLINT CHECK (years BETWEEN 0 AND 60),
  PRIMARY KEY (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id        UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest_id);

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title              TEXT NOT NULL,
  summary            TEXT,
  description        TEXT,
  industry           TEXT,
  tags               TEXT[] DEFAULT '{}',
  status             project_status NOT NULL DEFAULT 'draft',
  stage              project_stage NOT NULL DEFAULT 'idea',
  visibility         visibility NOT NULL DEFAULT 'public',
  embedding          VECTOR(1536),
  search_tsv         tsvector,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS hnsw_projects_embedding ON projects USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING gin (search_tsv);
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION trg_projects_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.title,'') || ' ' || coalesce(NEW.summary,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_fts_insupd ON projects;
CREATE TRIGGER projects_fts_insupd BEFORE INSERT OR UPDATE
ON projects FOR EACH ROW EXECUTE FUNCTION trg_projects_fts();

CREATE TABLE IF NOT EXISTS project_members (
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               member_role NOT NULL DEFAULT 'member',
  status             member_status NOT NULL DEFAULT 'active',
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note               TEXT,
  status             application_status NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at         TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_app_once ON project_applications(project_id, applicant_id);

-- =============================================================================
-- CONVERSATIONS & MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type               conversation_type NOT NULL DEFAULT 'group',
  project_id         UUID REFERENCES projects(id) ON DELETE SET NULL,
  title              TEXT,
  created_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_message_at    TIMESTAMPTZ,
  messages_count     BIGINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               member_role NOT NULL DEFAULT 'member',
  last_read_at       TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type               message_type NOT NULL DEFAULT 'text',
  content            TEXT,
  reply_to_id        UUID REFERENCES messages(id) ON DELETE SET NULL,
  embedding          VECTOR(1536),
  search_tsv         tsvector,
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS hnsw_messages_embedding ON messages USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING gin (search_tsv);
CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FTS + conversation stats on insert
CREATE OR REPLACE FUNCTION trg_messages_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.content,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS messages_fts_insupd ON messages;
CREATE TRIGGER messages_fts_insupd BEFORE INSERT OR UPDATE OF content
ON messages FOR EACH ROW EXECUTE FUNCTION trg_messages_fts();

CREATE OR REPLACE FUNCTION trg_conv_stats() RETURNS trigger AS $$
BEGIN
  UPDATE conversations
    SET last_message_at = NEW.created_at,
        messages_count  = messages_count + 1,
        updated_at      = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS messages_after_ins_stats ON messages;
CREATE TRIGGER messages_after_ins_stats
AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION trg_conv_stats();

CREATE TABLE IF NOT EXISTS message_attachments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id         UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url                TEXT NOT NULL,
  mime_type          TEXT,
  size_bytes         BIGINT,
  width              INT,
  height             INT,
  duration_seconds   INT,
  checksum           TEXT,
  storage            storage_provider NOT NULL DEFAULT 's3',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msg_attachments_msg ON message_attachments(message_id);

-- =============================================================================
-- EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title              TEXT NOT NULL,
  description        TEXT,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at),
  location_kind      location_type NOT NULL DEFAULT 'online',
  location_text      TEXT,
  meeting_url        TEXT,
  capacity           INT CHECK (capacity IS NULL OR capacity >= 0),
  visibility         visibility NOT NULL DEFAULT 'public',
  embedding          VECTOR(1536),
  search_tsv         tsvector,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS hnsw_events_embedding ON events USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_events_fts ON events USING gin (search_tsv);
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION trg_events_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS events_fts_insupd ON events;
CREATE TRIGGER events_fts_insupd BEFORE INSERT OR UPDATE
ON events FOR EACH ROW EXECUTE FUNCTION trg_events_fts();

CREATE TABLE IF NOT EXISTS event_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at),
  speaker_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  speaker_name       TEXT,
  room               TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);

CREATE TABLE IF NOT EXISTS event_registrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             registration_status NOT NULL DEFAULT 'registered',
  registered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended           BOOLEAN,
  attendance_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_registration_once ON event_registrations(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations(user_id);

-- =============================================================================
-- LEARNING (Courses → Modules → Lessons → Quizzes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title              TEXT NOT NULL,
  description        TEXT,
  level              course_level NOT NULL DEFAULT 'beginner',
  category           TEXT,
  published          BOOLEAN NOT NULL DEFAULT FALSE,
  published_at       TIMESTAMPTZ,
  visibility         visibility NOT NULL DEFAULT 'public',
  embedding          VECTOR(1536),
  search_tsv         tsvector,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_author ON courses(author_id);
CREATE INDEX IF NOT EXISTS hnsw_courses_embedding ON courses USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses USING gin (search_tsv);
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION trg_courses_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS courses_fts_insupd ON courses;
CREATE TRIGGER courses_fts_insupd BEFORE INSERT OR UPDATE
ON courses FOR EACH ROW EXECUTE FUNCTION trg_courses_fts();

CREATE TABLE IF NOT EXISTS course_modules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  position           INT NOT NULL DEFAULT 1 CHECK (position > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_module_position ON course_modules(course_id, position);

CREATE TABLE IF NOT EXISTS lessons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id          UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  content_md         TEXT,
  video_url          TEXT,
  duration_seconds   INT,
  position           INT NOT NULL DEFAULT 1 CHECK (position > 0),
  embedding          VECTOR(1536),
  search_tsv         tsvector
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lesson_position ON lessons(module_id, position);
CREATE INDEX IF NOT EXISTS hnsw_lessons_embedding ON lessons USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_fts ON lessons USING gin (search_tsv);
CREATE OR REPLACE FUNCTION trg_lessons_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.title,'') || ' ' || coalesce(NEW.content_md,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS lessons_fts_insupd ON lessons;
CREATE TRIGGER lessons_fts_insupd BEFORE INSERT OR UPDATE
ON lessons FOR EACH ROW EXECUTE FUNCTION trg_lessons_fts();

CREATE TABLE IF NOT EXISTS lesson_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id          UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type               asset_type NOT NULL,
  title              TEXT,
  url                TEXT NOT NULL,
  size_bytes         BIGINT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_lesson ON lesson_assets(lesson_id);

CREATE TABLE IF NOT EXISTS quizzes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id          UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  time_limit_sec     INT CHECK (time_limit_sec IS NULL OR time_limit_sec > 0)
);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type               question_type NOT NULL,
  question_text      TEXT NOT NULL,
  options            JSONB,
  correct_answer     JSONB
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score              NUMERIC(5,2),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  answers            JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempt_once ON quiz_attempts(quiz_id, user_id, started_at);

CREATE TABLE IF NOT EXISTS enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status             enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_once ON enrollments(user_id, course_id);

CREATE TABLE IF NOT EXISTS progress (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id          UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status             lesson_progress_status NOT NULL DEFAULT 'not_started',
  current_pos_sec    INT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_progress_once ON progress(user_id, lesson_id);

-- =============================================================================
-- RESOURCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  type               TEXT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  url                TEXT,
  tags               TEXT[] DEFAULT '{}',
  visibility         visibility NOT NULL DEFAULT 'public',
  embedding          VECTOR(1536),
  search_tsv         tsvector,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_id);
CREATE INDEX IF NOT EXISTS hnsw_resources_embedding ON resources USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS idx_resources_fts ON resources USING gin (search_tsv);
CREATE TRIGGER trg_resources_updated_at
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION trg_resources_fts() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := tsv_update_simple(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS resources_fts_insupd ON resources;
CREATE TRIGGER resources_fts_insupd BEFORE INSERT OR UPDATE
ON resources FOR EACH ROW EXECUTE FUNCTION trg_resources_fts();

-- =============================================================================
-- RECOMMENDATIONS / ASSISTANT
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type        target_type NOT NULL,
  target_id          UUID NOT NULL,
  rating             SMALLINT NOT NULL CHECK (rating BETWEEN -1 AND 1),
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_user ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_target ON recommendation_feedback(target_type, target_id);

CREATE TABLE IF NOT EXISTS assistant_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id    UUID REFERENCES conversations(id) ON DELETE SET NULL,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ,
  metadata           JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS assistant_cache (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key          TEXT NOT NULL UNIQUE,
  payload            JSONB NOT NULL DEFAULT '{}',
  query_embedding    VECTOR(1536),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hnsw_assistant_cache_query ON assistant_cache USING hnsw (query_embedding vector_l2_ops);

-- =============================================================================
-- GAMIFICATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS badges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               CITEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  description        TEXT,
  icon_url           TEXT,
  criteria           JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id           UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta_points       INT NOT NULL,
  source_type        points_source_type NOT NULL,
  source_id          UUID,
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);

CREATE TABLE IF NOT EXISTS challenges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  status             challenge_status NOT NULL DEFAULT 'upcoming',
  starts_at          TIMESTAMPTZ,
  ends_at            TIMESTAMPTZ,
  points_reward      INT CHECK (points_reward IS NULL OR points_reward >= 0),
  rules              JSONB NOT NULL DEFAULT '{}'
);

-- =============================================================================
-- BILLING
-- =============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               CITEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  price_cents        INT NOT NULL CHECK (price_cents >= 0),
  currency           CHAR(3) NOT NULL DEFAULT 'EUR',
  interval           plan_interval NOT NULL DEFAULT 'month',
  features           JSONB NOT NULL DEFAULT '{}',
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status             subscription_status NOT NULL DEFAULT 'active',
  seats              INT NOT NULL DEFAULT 1 CHECK (seats > 0),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at          TIMESTAMPTZ,
  canceled_at        TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user_active
ON subscriptions(user_id) WHERE (status IN ('trialing','active','past_due'));

CREATE TABLE IF NOT EXISTS entitlements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id    UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_code       CITEXT NOT NULL,
  limit_value        INT,
  used_value         INT NOT NULL DEFAULT 0,
  reset_every        reset_interval NOT NULL DEFAULT 'month',
  expires_at         TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_entitlement_feature ON entitlements(subscription_id, feature_code);

CREATE TABLE IF NOT EXISTS invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id    UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount_cents       INT NOT NULL CHECK (amount_cents >= 0),
  currency           CHAR(3) NOT NULL DEFAULT 'EUR',
  status             invoice_status NOT NULL DEFAULT 'open',
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at             TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  external_invoice_id TEXT,
  pdf_url            TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);

-- Webhooks de facturation (idempotence)
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           TEXT NOT NULL DEFAULT 'stripe',
  event_id           TEXT NOT NULL UNIQUE,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload            JSONB NOT NULL,
  processed_at       TIMESTAMPTZ,
  processing_error   TEXT
);

-- SSO / OAuth
CREATE TABLE IF NOT EXISTS auth_identities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL,
  provider_user_id   TEXT NOT NULL,
  email              CITEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

-- =============================================================================
-- NOTIFICATIONS / AUDIT / JOBS / OUTBOX
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               notification_type NOT NULL,
  title              TEXT,
  body               TEXT,
  data               JSONB NOT NULL DEFAULT '{}',
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action             TEXT NOT NULL,
  entity_type        TEXT NOT NULL,
  entity_id          UUID,
  before             JSONB,
  after              JSONB,
  ip_address         INET,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);

CREATE TABLE IF NOT EXISTS jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue              TEXT NOT NULL,
  job_type           TEXT NOT NULL,
  status             job_status NOT NULL DEFAULT 'queued',
  priority           INT NOT NULL DEFAULT 0,
  run_at             TIMESTAMPTZ,
  attempts           INT NOT NULL DEFAULT 0,
  last_error         TEXT,
  payload            JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs(queue, status, run_at);
CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Outbox transactionnelle (webhooks, emails, etc.)
CREATE TABLE IF NOT EXISTS outbox_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic              TEXT NOT NULL,
  aggregate_type     TEXT NOT NULL,
  aggregate_id       UUID,
  payload            JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at       TIMESTAMPTZ,
  UNIQUE (topic, aggregate_type, aggregate_id, created_at)
);
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(topic) WHERE processed_at IS NULL;

-- =============================================================================
-- ANALYTICS / METRICS (track_events partitionné)
-- =============================================================================
-- Parent partitioned table
CREATE TABLE IF NOT EXISTS track_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name         TEXT NOT NULL,
  properties         JSONB NOT NULL DEFAULT '{}',
  context            JSONB NOT NULL DEFAULT '{}',
  occurred_at        TIMESTAMPTZ NOT NULL,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

-- Default partition (fallback)
CREATE TABLE IF NOT EXISTS track_events_default
PARTITION OF track_events DEFAULT;

-- Ensure partitions for current and next month
SELECT ensure_track_events_partition_for((now())::date);
SELECT ensure_track_events_partition_for((now() + interval '1 month')::date);

CREATE TABLE IF NOT EXISTS agg_daily_metrics (
  day                DATE PRIMARY KEY,
  dau                INT,
  new_users          INT,
  messages_sent      INT,
  projects_created   INT,
  revenue_cents      BIGINT,
  data               JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS project_metrics (
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day                DATE NOT NULL,
  members_count      INT,
  messages_count     INT,
  applications_count INT,
  data               JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (project_id, day)
);

CREATE TABLE IF NOT EXISTS financial_metrics (
  day                DATE PRIMARY KEY,
  mrr_cents          BIGINT,
  arr_cents          BIGINT,
  arpu_cents         BIGINT,
  churn_rate         NUMERIC(6,4),
  new_mrr_cents      BIGINT,
  expansion_mrr_cents BIGINT,
  contraction_mrr_cents BIGINT
);

-- -----------------------------------------------------------------------------
-- RLS (Row-Level Security) — enable & policies
-- -----------------------------------------------------------------------------
-- Enable + force on sensitive tables
DO $$
BEGIN
  PERFORM 1;
  -- helper procedure: enable & force if not already
END$$;

-- Users & profiles
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY; ALTER TABLE users                 FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY; ALTER TABLE profiles              FORCE ROW LEVEL SECURITY;

-- Projects & membership
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY; ALTER TABLE projects              FORCE ROW LEVEL SECURITY;
ALTER TABLE project_members       ENABLE ROW LEVEL SECURITY; ALTER TABLE project_members       FORCE ROW LEVEL SECURITY;
ALTER TABLE project_applications  ENABLE ROW LEVEL SECURITY; ALTER TABLE project_applications  FORCE ROW LEVEL SECURITY;

-- Conversations & messages
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY; ALTER TABLE conversations         FORCE ROW LEVEL SECURITY;
ALTER TABLE conversation_members  ENABLE ROW LEVEL SECURITY; ALTER TABLE conversation_members  FORCE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY; ALTER TABLE messages              FORCE ROW LEVEL SECURITY;
ALTER TABLE message_attachments   ENABLE ROW LEVEL SECURITY; ALTER TABLE message_attachments   FORCE ROW LEVEL SECURITY;

-- Notifications, billing
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY; ALTER TABLE notifications         FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions         FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices              ENABLE ROW LEVEL SECURITY; ALTER TABLE invoices              FORCE ROW LEVEL SECURITY;

-- Events
ALTER TABLE events                ENABLE ROW LEVEL SECURITY; ALTER TABLE events                FORCE ROW LEVEL SECURITY;
ALTER TABLE event_sessions        ENABLE ROW LEVEL SECURITY; ALTER TABLE event_sessions        FORCE ROW LEVEL SECURITY;
ALTER TABLE event_registrations   ENABLE ROW LEVEL SECURITY; ALTER TABLE event_registrations   FORCE ROW LEVEL SECURITY;

-- Learning
ALTER TABLE courses               ENABLE ROW LEVEL SECURITY; ALTER TABLE courses               FORCE ROW LEVEL SECURITY;
ALTER TABLE course_modules        ENABLE ROW LEVEL SECURITY; ALTER TABLE course_modules        FORCE ROW LEVEL SECURITY;
ALTER TABLE lessons               ENABLE ROW LEVEL SECURITY; ALTER TABLE lessons               FORCE ROW LEVEL SECURITY;
ALTER TABLE lesson_assets         ENABLE ROW LEVEL SECURITY; ALTER TABLE lesson_assets         FORCE ROW LEVEL SECURITY;
ALTER TABLE enrollments           ENABLE ROW LEVEL SECURITY; ALTER TABLE enrollments           FORCE ROW LEVEL SECURITY;
ALTER TABLE progress              ENABLE ROW LEVEL SECURITY; ALTER TABLE progress              FORCE ROW LEVEL SECURITY;
ALTER TABLE quizzes               ENABLE ROW LEVEL SECURITY; ALTER TABLE quizzes               FORCE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions        ENABLE ROW LEVEL SECURITY; ALTER TABLE quiz_questions        FORCE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts         ENABLE ROW LEVEL SECURITY; ALTER TABLE quiz_attempts         FORCE ROW LEVEL SECURITY;

-- Resources
ALTER TABLE resources             ENABLE ROW LEVEL SECURITY; ALTER TABLE resources             FORCE ROW LEVEL SECURITY;

-- Admin/infra-only
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_log             FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs                  ENABLE ROW LEVEL SECURITY; ALTER TABLE jobs                  FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events         ENABLE ROW LEVEL SECURITY; ALTER TABLE outbox_events         FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY; ALTER TABLE billing_webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE track_events_default  ENABLE ROW LEVEL SECURITY; ALTER TABLE track_events_default  FORCE ROW LEVEL SECURITY;
-- partitions inherit RLS; enabling on parent is implicit, but we force on default explicitly.

-- Assistant & feedback
ALTER TABLE assistant_sessions    ENABLE ROW LEVEL SECURITY; ALTER TABLE assistant_sessions    FORCE ROW LEVEL SECURITY;
ALTER TABLE assistant_cache       ENABLE ROW LEVEL SECURITY; ALTER TABLE assistant_cache       FORCE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY; ALTER TABLE recommendation_feedback FORCE ROW LEVEL SECURITY;

-- Policies

-- users: self read/write; admin full
CREATE POLICY users_select_self_or_admin ON users FOR SELECT
USING (id = app_user_id() OR app_is_admin());
CREATE POLICY users_update_self_or_admin ON users FOR UPDATE
USING (id = app_user_id() OR app_is_admin())
WITH CHECK (id = app_user_id() OR app_is_admin());

-- profiles: public read; owner/admin read/write
CREATE POLICY profiles_select_public_or_owner ON profiles FOR SELECT
USING (visibility = 'public' OR user_id = app_user_id() OR app_is_admin());
CREATE POLICY profiles_update_owner_or_admin ON profiles FOR UPDATE
USING (user_id = app_user_id() OR app_is_admin())
WITH CHECK (user_id = app_user_id() OR app_is_admin());

-- projects: public read; member read; owner/admin write
CREATE POLICY projects_select_public_or_member ON projects FOR SELECT
USING (
  visibility = 'public'
  OR owner_id = app_user_id()
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = app_user_id())
  OR app_is_admin()
);
CREATE POLICY projects_update_owner_or_admin ON projects FOR UPDATE
USING (owner_id = app_user_id() OR app_is_admin())
WITH CHECK (owner_id = app_user_id() OR app_is_admin());

-- project_members: visible aux membres du projet
CREATE POLICY project_members_select_member ON project_members FOR SELECT
USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = app_user_id())
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = app_user_id())
  OR app_is_admin()
);

-- project_applications: applicant, owner, admin
CREATE POLICY project_applications_select_related ON project_applications FOR SELECT
USING (
  applicant_id = app_user_id()
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_applications.project_id AND p.owner_id = app_user_id())
  OR app_is_admin()
);

-- conversations: member view
CREATE POLICY conversations_select_member ON conversations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = app_user_id())
  OR app_is_admin()
);

-- conversation_members: member view
CREATE POLICY conversation_members_select_member ON conversation_members FOR SELECT
USING (
  EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = app_user_id())
  OR app_is_admin()
);

-- messages: only members; update own or admin
CREATE POLICY messages_select_member ON messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = app_user_id())
  OR app_is_admin()
);
CREATE POLICY messages_insert_member ON messages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = app_user_id())
  OR app_is_admin()
);
CREATE POLICY messages_update_own_or_admin ON messages FOR UPDATE
USING (sender_id = app_user_id() OR app_is_admin())
WITH CHECK (sender_id = app_user_id() OR app_is_admin());

-- message_attachments: visible aux membres
CREATE POLICY message_attachments_select_member ON message_attachments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM messages m JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
          WHERE m.id = message_attachments.message_id AND cm.user_id = app_user_id())
  OR app_is_admin()
);

-- notifications: owner or admin
CREATE POLICY notifications_select_own_or_admin ON notifications FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());
CREATE POLICY notifications_update_own_or_admin ON notifications FOR UPDATE
USING (user_id = app_user_id() OR app_is_admin())
WITH CHECK (user_id = app_user_id() OR app_is_admin());

-- billing
CREATE POLICY subscriptions_select_own_or_admin ON subscriptions FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());
CREATE POLICY invoices_select_own_or_admin ON invoices FOR SELECT
USING (
  EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = invoices.subscription_id AND s.user_id = app_user_id())
  OR app_is_admin()
);

-- events: public read; organizer or registrant specifics
CREATE POLICY events_select_public_or_related ON events FOR SELECT
USING (
  visibility = 'public'
  OR organizer_id = app_user_id()
  OR EXISTS (SELECT 1 FROM event_registrations er WHERE er.event_id = events.id AND er.user_id = app_user_id())
  OR app_is_admin()
);
CREATE POLICY event_registrations_select_self_or_organizer ON event_registrations FOR SELECT
USING (
  user_id = app_user_id()
  OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_registrations.event_id AND e.organizer_id = app_user_id())
  OR app_is_admin()
);

-- learning
CREATE POLICY courses_select_public_or_author ON courses FOR SELECT
USING (visibility = 'public' OR author_id = app_user_id() OR app_is_admin());
CREATE POLICY enrollments_select_own_or_admin ON enrollments FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());
CREATE POLICY progress_select_own_or_admin ON progress FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());
CREATE POLICY quiz_attempts_select_own_or_admin ON quiz_attempts FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());

-- resources: public read
CREATE POLICY resources_select_public_or_admin ON resources FOR SELECT
USING (visibility = 'public' OR app_is_admin());

-- assistant
CREATE POLICY assistant_sessions_select_user_or_admin ON assistant_sessions FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());
CREATE POLICY assistant_cache_select_admin_only ON assistant_cache FOR SELECT
USING (app_is_admin());  -- cache interne

-- admin/infra-only
CREATE POLICY audit_log_select_admin_only ON audit_log FOR SELECT USING (app_is_admin());
CREATE POLICY jobs_select_admin_only      ON jobs      FOR SELECT USING (app_is_admin());
CREATE POLICY outbox_select_admin_only    ON outbox_events FOR SELECT USING (app_is_admin());
CREATE POLICY billing_webhook_select_admin_only ON billing_webhook_events FOR SELECT USING (app_is_admin());
CREATE POLICY track_events_default_select_admin_only ON track_events_default FOR SELECT USING (app_is_admin());

-- recommendation feedback: own or admin
CREATE POLICY rec_feedback_select_own_or_admin ON recommendation_feedback FOR SELECT
USING (user_id = app_user_id() OR app_is_admin());

-- -----------------------------------------------------------------------------
-- Final notes
-- - Similarité vecteur: indexes utilisent L2 (vector_l2_ops). Pour cosinus, remplacez par vector_cosine_ops
--   et normalisez les embeddings côté app.
-- - Rétention analytics: planifiez un job DELETE sur track_events (ex: >180 jours).
-- -----------------------------------------------------------------------------

COMMIT;
