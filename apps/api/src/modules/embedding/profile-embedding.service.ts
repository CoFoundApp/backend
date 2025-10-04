import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT, EmbeddingPort } from './embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { createHash } from 'node:crypto';

type ProfileBasics = {
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  languages: string[];
};

type UserSkillRow = {
  level: number | null;
  years: number | null;
  skills: { name: string; slug: string | null };
};

type UserInterestRow = {
  interests: { name: string; slug: string | null };
};

type WorkExperienceRow = {
  title: string;
  company: string;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
  description: string | null;
  location: string | null;
};

type EducationRow = {
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
  grade: string | null;
  description: string | null;
};

type VolunteerExperienceRow = {
  title: string;
  organization: string;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
  cause: string | null;
  description: string | null;
};

function sha256Hex(s: string) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

@Injectable()
export class ProfileEmbeddingService {
  private readonly logger = new Logger(ProfileEmbeddingService.name);
  private readonly model = process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed';
  private readonly expectedDim = Number(process.env.EMBEDDING_DIM || 1024);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly port: EmbeddingPort,
  ) {}

  /**
   * Idempotent:
   * - skip si hash(profile_text + model) inchangé (s'appuie sur profiles.embedding_text_hash)
   * - dédup déjà en amont via jobId = `profile:<userId>` dans la queue
   */
  async recomputeForUser(userId: string): Promise<boolean> {
    const t0 = Date.now();
    const db = this.prisma.prisma();

    // 1) Charger les données
   const [
      p,
      userSkills,
      userInterests,
      workExperiences,
      educationEntries,
      volunteerExperiences,
    ] = (await Promise.all([
      db.profiles.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          display_name: true,
          headline: true,
          bio: true,
          location: true,
          languages: true,
        },
      }),
      db.user_skills.findMany({
        where: { user_id: userId },
        select: {
          level: true,
          years: true,
          skills: { select: { name: true, slug: true } },
        },
        orderBy: [{ level: 'desc' }, { years: 'desc' }],
      }),
      db.user_interests.findMany({
        where: { user_id: userId },
        select: { interests: { select: { name: true, slug: true } } },
      }),
      db.work_experiences.findMany({
        where: { user_id: userId },
        select: {
          title: true,
          company: true,
          start_date: true,
          end_date: true,
          is_current: true,
          description: true,
          location: true,
        },
        orderBy: [{ start_date: 'desc' }],
      }),
      db.educations.findMany({
        where: { user_id: userId },
        select: {
          school: true,
          degree: true,
          field_of_study: true,
          start_date: true,
          end_date: true,
          is_current: true,
          grade: true,
          description: true,
        },
        orderBy: [{ start_date: 'desc' }],
      }),
      db.volunteer_experiences.findMany({
        where: { user_id: userId },
        select: {
          title: true,
          organization: true,
          start_date: true,
          end_date: true,
          is_current: true,
          cause: true,
          description: true,
        },
        orderBy: [{ start_date: 'desc' }],
      }),
    ])) as [
      ProfileBasics | null,
      UserSkillRow[],
      UserInterestRow[],
      WorkExperienceRow[],
      EducationRow[],
      VolunteerExperienceRow[],
    ];

    if (!p) {
      this.logger.warn(`No profile found for user ${userId} — skipping`);
      return false;
    }

    // 2) Texte & hash
    const profileText = this.buildProfileText(
      p,
      userSkills,
      userInterests,
      workExperiences,
      educationEntries,
      volunteerExperiences,
    );
    const textHash = sha256Hex(`${this.model}::${profileText}`);

    // 3) Idempotence (cast UUID)
    const hashRows = await db.$queryRaw<{ embedding_text_hash: string | null }[]>`
      SELECT embedding_text_hash
      FROM profiles
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    const currentHash = hashRows[0]?.embedding_text_hash ?? null;
    if (currentHash && currentHash === textHash) {
      this.logger.log(`skip (unchanged) user=${userId}`);
      return true;
    }

    // 4) Provider embedding
    const vec = await this.port.embedText(profileText);
    if (!Array.isArray(vec) || !vec.length) {
      throw new Error('Embedding provider returned empty vector');
    }
    if (vec.length !== this.expectedDim) {
      throw new Error(`Invalid vector dimension: got ${vec.length}, expected ${this.expectedDim}`);
    }

    // 5) Update pgvector + meta
    const vecLit = toVectorLiteral(vec);
    await db.$executeRawUnsafe(
      `
      UPDATE profiles
        SET embedding           = '${vecLit}'::halfvec,
            embedding_text_hash = $1,
            embedding_at        = NOW(),
            embedding_model     = $2,
            embedding_dim       = $3::int2,
            updated_at          = NOW()
      WHERE user_id             = $4::uuid
      `,
      textHash,
      this.model,
      this.expectedDim,
      userId,
    );

    const ms = Date.now() - t0;
    this.logger.log(JSON.stringify({
      event: 'profile_embedding_updated',
      userId,
      dim: this.expectedDim,
      model: this.model,
      text_len: profileText.length,
      ms,
    }));

    return true;
  }


  private buildProfileText(
    p: ProfileBasics,
    userSkills: UserSkillRow[],
    userInterests: UserInterestRow[],
    workExperiences: WorkExperienceRow[],
    educationEntries: EducationRow[],
    volunteerExperiences: VolunteerExperienceRow[],
  ): string {
    const parts: string[] = [];
    const formatDate = (date: Date | null) =>
      date ? date.toISOString().split('T')[0] : null;

    if (p.display_name) parts.push(`name: ${p.display_name}`);
    if (p.headline) parts.push(`headline: ${p.headline}`);
    if (p.bio) parts.push(`bio: ${p.bio}`);
    if (p.location) parts.push(`location: ${p.location}`);
    if (p.languages?.length) parts.push(`languages: ${p.languages.join(', ')}`);

    if (userSkills.length) {
      const skillsText = userSkills
        .map(({ skills, level, years }) => {
          const bits: string[] = [skills.name];
          if (level != null) bits.push(`lvl:${Math.max(0, Math.min(5, level))}`);
          if (years != null) bits.push(`${Math.max(0, years)}y`);
          return bits.join(' ');
        })
        .join(', ');
      parts.push(`skills: ${skillsText}`);
    }

    if (userInterests.length) {
      const interestsText = userInterests.map(({ interests }) => interests.name).join(', ');
      parts.push(`interests: ${interestsText}`);
    }

    if (workExperiences.length) {
      const workText = workExperiences
        .map((work) => {
          const segments: string[] = [`${work.title}`];
          if (work.company) segments.push(`@${work.company}`);
          if (work.location) segments.push(`in ${work.location}`);
          const start = formatDate(work.start_date);
          const end = work.is_current ? 'present' : formatDate(work.end_date);
          if (start || end) segments.push(`(${start ?? '?'}-${end ?? '?'})`);
          if (work.description) segments.push(`desc:${work.description}`);
          return segments.join(' ');
        })
        .join(' || ');
      parts.push(`work: ${workText}`);
    }

    if (educationEntries.length) {
      const eduText = educationEntries
        .map((edu) => {
          const segments: string[] = [edu.school];
          if (edu.degree) segments.push(edu.degree);
          if (edu.field_of_study) segments.push(`field:${edu.field_of_study}`);
          const start = formatDate(edu.start_date);
          const end = edu.is_current ? 'present' : formatDate(edu.end_date);
          if (start || end) segments.push(`(${start ?? '?'}-${end ?? '?'})`);
          if (edu.grade) segments.push(`grade:${edu.grade}`);
          if (edu.description) segments.push(`desc:${edu.description}`);
          return segments.join(' ');
        })
        .join(' || ');
      parts.push(`education: ${eduText}`);
    }

    if (volunteerExperiences.length) {
      const volunteerText = volunteerExperiences
        .map((vol) => {
          const segments: string[] = [vol.title];
          if (vol.organization) segments.push(`@${vol.organization}`);
          const start = formatDate(vol.start_date);
          const end = vol.is_current ? 'present' : formatDate(vol.end_date);
          if (start || end) segments.push(`(${start ?? '?'}-${end ?? '?'})`);
          if (vol.cause) segments.push(`cause:${vol.cause}`);
          if (vol.description) segments.push(`desc:${vol.description}`);
          return segments.join(' ');
        })
        .join(' || ');
      parts.push(`volunteer: ${volunteerText}`);
    }

    return parts.join(' | ');
  }
}
