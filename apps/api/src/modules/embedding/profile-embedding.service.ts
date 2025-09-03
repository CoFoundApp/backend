import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EMBEDDING_PORT, EmbeddingPort } from './embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import { createHash } from 'node:crypto';

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
    const [p, userSkills, userInterests] = await Promise.all([
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
    ]);

    if (!p) {
      this.logger.warn(`No profile found for user ${userId} — skipping`);
      return false;
    }

    // 2) Texte & hash
    const profileText = this.buildProfileText(p, userSkills, userInterests);
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
        SET embedding           = '${vecLit}'::vector,
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
    p: {
      display_name: string | null;
      headline: string | null;
      bio: string | null;
      location: string | null;
      languages: string[];
    },
    userSkills: Array<{ level: number | null; years: number | null; skills: { name: string; slug: string | null } }>,
    userInterests: Array<{ interests: { name: string; slug: string | null } }>,
  ): string {
    const parts: string[] = [];

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

    return parts.join(' | ');
  }
}
