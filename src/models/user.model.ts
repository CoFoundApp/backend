model ExperienceSkill {
    skill_id     BigInt
    experience_id BigInt
  }
  
  model Skill {
    name String
    id   BigInt @id @default(autoincrement())
  }
  
  model ProjectSkill {
    project_id BigInt
    skill_id   BigInt
  }
  
  model Contributor {
    id           BigInt @id @default(autoincrement())
    ending_date  DateTime?
    role         String
    project_id   BigInt
    mission      String
    user_id      BigInt
    starting_date DateTime
  }
  
  model Experience {
    user_id      BigInt
    description  String
    ending_date  DateTime?
    starting_date DateTime
    id           BigInt @id @default(autoincrement())
    title        String
    location     String
    role         String
  }
  
  model Favorites {
    project_id BigInt
    user_id    BigInt
  }
  
  model Messages {
    receiver_user_id BigInt
    sent_date        DateTime
    message          String
    id               BigInt @id @default(autoincrement())
    sender_user_id   BigInt
    seen_date        DateTime?
  }
  
  model UserSkill {
    user_id BigInt
    skil_id BigInt
  }
  
  model Project {
    user_id       BigInt
    ending_date   DateTime?
    starting_date DateTime
    description   String
    id            BigInt @id @default(autoincrement())
    title         String
  }
  
  model TopicProject {
    project_id BigInt
    topic_id   BigInt
  }
  
  model Application {
    is_refused  Boolean
    is_accepted Boolean
    description String
    user_id     BigInt
    id          BigInt @id @default(autoincrement())
    project_id  BigInt
  }
  
  model Topic {
    id   BigInt @id @default(autoincrement())
    name String
  }
  
  model Profil {
    notif_email    Boolean
    notif_phone    Boolean
    availability   String
    location       String
    user_id        BigInt
    id             BigInt @id @default(autoincrement())
    topic_id       BigInt?
    notif_push     Boolean
  }
  
  model User {
    is_admin    Boolean
    email       String
    last_name   String
    first_name  String
    id          BigInt @id @default(autoincrement())
    password    String
    phone_number Int?
    username    String
  }
  
  model Notification {
    user_id          BigInt
    id               BigInt @id @default(autoincrement())
    emitter_projet_id BigInt?
    emitter_user_id   BigInt?
    link             String?
    seen             Boolean
    description      String
  }
  