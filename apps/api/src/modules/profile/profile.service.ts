import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateMyProfileInput } from './dto/update-my-profile.input';
import { ProfileVisibility } from '../../common/enums/domain.enums';
import { mapVisibilityToPrisma } from '../../common/enums/enum-mapper';
import { isUuid } from '../../common/utils/uuid.util';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

function normalizeVisibility(v?: string | null): 'public' | 'unlisted' | 'private' | undefined {
  if (!v) return undefined;
  const s = String(v).toLowerCase();
  if (s === 'public') return 'public';
  if (s === 'unlisted') return 'unlisted';
  if (s === 'private') return 'private';
  if (s === 'public'.toUpperCase().toLowerCase()) return 'public';
  return undefined;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService) {}

  /** Renvoie un profil public/unlisted. */
  async getPublicProfileById(id: string) {
    if (!isUuid(id)) return null;
    return this.prisma.prisma().profiles.findFirst({
      where: {
        id,
        visibility: { in: [mapVisibilityToPrisma(ProfileVisibility.PUBLIC), mapVisibilityToPrisma(ProfileVisibility.UNLISTED)] },
      },
    });
  }

  /** lire mon profil (créé s'il n'existe pas) */
  async getMyProfile(userId: string) {
    return this.prisma.prisma().profiles.findUnique({ where: { user_id: userId } });
  }

  /** créer mon profil s'il n'existe pas */
  async ensureMyProfile(userId: string) {
    const found = await this.getMyProfile(userId);
    if (found) return found;
    return this.prisma.prisma().profiles.create({
      data: {
        user_id: userId,
        languages: [],
        tags: [],
        visibility: mapVisibilityToPrisma(ProfileVisibility.PRIVATE),
      },
    });
  }

  /** mise à jour de mon profil */
  async updateMyProfile(userId: string, input: UpdateMyProfileInput) {
    // on isole languages/tags pour ne pas les écraser en 'undefined' dans create
    const base: any = {
      display_name: input.display_name ?? undefined,
      headline: input.headline ?? undefined,
      bio: input.bio ?? undefined,
      location: input.location ?? undefined,
      website_url: input.website_url ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      banner_url: input.banner_url ?? undefined,
      looking_for: input.looking_for ?? undefined,
      availability_hours: input.availability_hours ?? undefined,
      updated_at: new Date(),
    };

    const visibility = normalizeVisibility((input as any).visibility);

    const userEmail = (await this.prisma.prisma().users.findUnique({
      where: { id: userId },
      select: { email: true },
    }))?.email;

    await this.mail.sendTemplate(userEmail || "", 'profile_update', 'en', {
      display_name: input.display_name,
      headline: input.headline,
      bio: input.bio,
      location: input.location,
      website_url: input.website_url,
      avatar_url: input.avatar_url,
      banner_url: input.banner_url,
      looking_for: input.looking_for,
      availability_hours: input.availability_hours,
      updated_at: new Date(),
      app_name: process.env.APP_NAME,
    });

    return this.prisma.prisma().profiles.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        languages: Array.isArray(input.languages) ? input.languages : [],
        tags: Array.isArray(input.tags) ? input.tags : [],
        ...base,
        ...(visibility ? { visibility } : {}),
      },
      update: {
        ...base,
        ...(Array.isArray(input.languages) ? { languages: input.languages } : {}),
        ...(Array.isArray(input.tags) ? { tags: input.tags } : {}),
        ...(visibility ? { visibility } : {}),
      },
    });
  }

  /** liste des profils Admin */
  async adminListProfiles(limit = 50) {
    return this.prisma.prisma().profiles.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /** Optionnel : sécurité de cohérence (si besoin d’edit d’un autre profil) */
  async assertOwnershipOrAdmin(requesterId: string, targetUserId: string, isAdmin: boolean) {
    if (requesterId === targetUserId || isAdmin) return true;
    throw new ForbiddenException('Not allowed');
  }
}
