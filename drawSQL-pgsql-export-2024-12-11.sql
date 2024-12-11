CREATE TABLE "user"(
    "id" BIGINT NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" INTEGER NULL,
    "username" VARCHAR(255) NOT NULL,
    "is_admin" BOOLEAN NOT NULL
);
ALTER TABLE
    "user" ADD PRIMARY KEY("id");
ALTER TABLE
    "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");
ALTER TABLE
    "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
CREATE TABLE "profil"(
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "availability" VARCHAR(255) CHECK
        ("availability" IN('')) NOT NULL,
        "location" VARCHAR(255) NOT NULL,
        "notif_push" BOOLEAN NOT NULL,
        "notif_email" BOOLEAN NOT NULL,
        "notif_phone" BOOLEAN NOT NULL,
        "topic_id" BIGINT NULL
);
ALTER TABLE
    "profil" ADD PRIMARY KEY("id");
CREATE TABLE "experience"(
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "starting_date" DATE NOT NULL,
    "ending_date" DATE NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) CHECK
        ("role" IN('')) NOT NULL
);
ALTER TABLE
    "experience" ADD PRIMARY KEY("id");
CREATE TABLE "user_skill"(
    "user_id" BIGINT NOT NULL,
    "skil_id" BIGINT NOT NULL
);
CREATE TABLE "skill"(
    "id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "skill" ADD PRIMARY KEY("id");
CREATE TABLE "notification"(
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "link" VARCHAR(255) NULL,
    "description" VARCHAR(255) NOT NULL,
    "seen" BOOLEAN NOT NULL,
    "emitter_user_id" BIGINT NULL,
    "emitter_projet_id" BIGINT NULL
);
ALTER TABLE
    "notification" ADD PRIMARY KEY("id");
CREATE TABLE "experience_skill"(
    "skill_id" BIGINT NOT NULL,
    "experience_id" BIGINT NOT NULL
);
CREATE TABLE "project"(
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "starting_date" DATE NOT NULL,
    "ending_date" DATE NULL
);
ALTER TABLE
    "project" ADD PRIMARY KEY("id");
CREATE TABLE "project_skill"(
    "project_id" BIGINT NOT NULL,
    "skill_id" BIGINT NOT NULL
);
CREATE TABLE "contributor"(
    "id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "starting_date" DATE NOT NULL,
    "ending_date" DATE NULL,
    "role" VARCHAR(255) CHECK
        ("role" IN('')) NOT NULL,
        "mission" TEXT NOT NULL
);
ALTER TABLE
    "contributor" ADD PRIMARY KEY("id");
CREATE TABLE "messages"(
    "id" BIGINT NOT NULL,
    "sender_user_id" BIGINT NOT NULL,
    "receiver_user_id" BIGINT NOT NULL,
    "sent_date" DATE NOT NULL,
    "seen_date" DATE NULL,
    "message" TEXT NOT NULL
);
ALTER TABLE
    "messages" ADD PRIMARY KEY("id");
CREATE TABLE "application"(
    "id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "is_refused" BOOLEAN NOT NULL,
    "is_accepted" BOOLEAN NOT NULL
);
ALTER TABLE
    "application" ADD PRIMARY KEY("id");
CREATE TABLE "favorites"(
    "user_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL
);
CREATE TABLE "topic_project"(
    "topic_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL
);
ALTER TABLE
    "topic_project" ADD PRIMARY KEY("topic_id");
CREATE TABLE "topic"(
    "id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "topic" ADD PRIMARY KEY("id");
ALTER TABLE
    "topic_project" ADD CONSTRAINT "topic_project_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "project"("id");
ALTER TABLE
    "project" ADD CONSTRAINT "project_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "messages" ADD CONSTRAINT "messages_sender_user_id_foreign" FOREIGN KEY("sender_user_id") REFERENCES "user"("id");
ALTER TABLE
    "favorites" ADD CONSTRAINT "favorites_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "project"("id");
ALTER TABLE
    "notification" ADD CONSTRAINT "notification_emitter_user_id_foreign" FOREIGN KEY("emitter_user_id") REFERENCES "user"("id");
ALTER TABLE
    "project_skill" ADD CONSTRAINT "project_skill_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "project"("id");
ALTER TABLE
    "topic_project" ADD CONSTRAINT "topic_project_topic_id_foreign" FOREIGN KEY("topic_id") REFERENCES "topic"("id");
ALTER TABLE
    "contributor" ADD CONSTRAINT "contributor_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "project"("id");
ALTER TABLE
    "favorites" ADD CONSTRAINT "favorites_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "experience" ADD CONSTRAINT "experience_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "application" ADD CONSTRAINT "application_id_foreign" FOREIGN KEY("id") REFERENCES "user"("id");
ALTER TABLE
    "user_skill" ADD CONSTRAINT "user_skill_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "user_skill" ADD CONSTRAINT "user_skill_skil_id_foreign" FOREIGN KEY("skil_id") REFERENCES "skill"("id");
ALTER TABLE
    "notification" ADD CONSTRAINT "notification_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "contributor" ADD CONSTRAINT "contributor_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "experience_skill" ADD CONSTRAINT "experience_skill_skill_id_foreign" FOREIGN KEY("skill_id") REFERENCES "skill"("id");
ALTER TABLE
    "profil" ADD CONSTRAINT "profil_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("id");
ALTER TABLE
    "messages" ADD CONSTRAINT "messages_receiver_user_id_foreign" FOREIGN KEY("receiver_user_id") REFERENCES "user"("id");
ALTER TABLE
    "project_skill" ADD CONSTRAINT "project_skill_skill_id_foreign" FOREIGN KEY("skill_id") REFERENCES "skill"("id");
ALTER TABLE
    "experience_skill" ADD CONSTRAINT "experience_skill_experience_id_foreign" FOREIGN KEY("experience_id") REFERENCES "experience"("id");