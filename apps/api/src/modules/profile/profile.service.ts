import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateMyProfileInput } from './dto/update-my-profile.input';
import { ProfileVisibility } from '../../common/enums/domain.enums';
import { mapVisibilityToPrisma } from '../../common/enums/enum-mapper';
import { clamp, trimToNull, uniq } from '../../common/utils/sanitize.util';
import { isUuid } from '../../common/utils/uuid.util';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
    const data: any = {
      display_name: trimToNull(input.display_name),
      headline: trimToNull(input.headline),
      bio: trimToNull(input.bio),
      location: trimToNull(input.location),
      languages: input.languages ? uniq(input.languages) : undefined,
      website_url: trimToNull(input.website_url),
      avatar_url: trimToNull(input.avatar_url),
      banner_url: trimToNull(input.banner_url),
      looking_for: trimToNull(input.looking_for),
      availability_hours:
        typeof input.availability_hours === 'number'
          ? clamp(input.availability_hours, 0, 40)
          : undefined,
      tags: input.tags ? uniq(input.tags.map(t => t.trim()).filter(Boolean)) : undefined,
      visibility: input.visibility ? mapVisibilityToPrisma(input.visibility) : undefined,
      updated_at: new Date(),
    };

    return this.prisma.prisma().profiles.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        languages: [],
        tags: [],
        visibility: mapVisibilityToPrisma(ProfileVisibility.PRIVATE),
        ...data,
      },
      update: data,
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
