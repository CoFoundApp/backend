import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateMyProfileInput } from './dto/update-my-profile.input';
import { ProfileVisibility } from '../../common/enums/domain.enums';
import { mapVisibilityToPrisma } from '../../common/enums/enum-mapper';
import { isUuid } from '../../common/utils/uuid.util';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { JobsService } from '../../queue/jobs.service';
import { MatchDetailLevel } from '../matching/types/match-detail-level.enum';
import { Prisma } from '@prisma/client';
import { WorkExperienceInput } from './dto/work-experience.input';
import { EducationInput } from './dto/education.input';
import { VolunteerExperienceInput } from './dto/volunteer-experience.input';
import { AutoTaxonomyService } from '../taxonomy/auto-taxonomy.service';
import { AppError } from '../../common/errors/app-error.factory';

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
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService,
    private readonly jobs: JobsService,
    private readonly taxonomy: AutoTaxonomyService,
  ) {}

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

  async updateMyProfile(userId: string, input: UpdateMyProfileInput) {
    // Préparer les données de base du profil
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

    if (input.preferred_work_styles !== undefined) {
      base.preferred_work_styles = Array.isArray(input.preferred_work_styles)
        ? input.preferred_work_styles
        : [];
    }

    if (input.core_values !== undefined) {
      base.core_values = Array.isArray(input.core_values) ? input.core_values : [];
    }

    if (input.primary_motivations !== undefined) {
      base.primary_motivations = Array.isArray(input.primary_motivations)
        ? input.primary_motivations
        : [];
    }

    if (input.preferred_environments !== undefined) {
      base.preferred_environments = Array.isArray(input.preferred_environments)
        ? input.preferred_environments
        : [];
    }

    if (input.preferred_team_size !== undefined) {
      base.preferred_team_size = input.preferred_team_size ?? null;
    }

    if (input.desired_team_role !== undefined) {
      base.desired_team_role = input.desired_team_role ?? null;
    }

    if (input.communication_style !== undefined) {
      base.communication_style = input.communication_style ?? null;
    }

    if (input.communication_frequency !== undefined) {
      base.communication_frequency = input.communication_frequency ?? null;
    }

    if (input.preferred_collaboration_mode !== undefined) {
      base.preferred_collaboration_mode = input.preferred_collaboration_mode ?? null;
    }

    if (input.timezone !== undefined) {
      base.timezone = input.timezone ?? null;
    }

    if (input.timezone_flexibility_minutes !== undefined) {
      base.timezone_flexibility_minutes = input.timezone_flexibility_minutes ?? null;
    }

    if (input.remote_preference_percent !== undefined) {
      base.remote_preference_percent = input.remote_preference_percent ?? null;
    }

    if (input.availability_time_slots !== undefined) {
      base.availability_time_slots =
        input.availability_time_slots === null
          ? Prisma.JsonNull
          : (input.availability_time_slots as Prisma.JsonValue);
    }

    if (input.mission_duration_min_weeks !== undefined) {
      base.mission_duration_min_weeks = input.mission_duration_min_weeks ?? null;
    }

    if (input.mission_duration_max_weeks !== undefined) {
      base.mission_duration_max_weeks = input.mission_duration_max_weeks ?? null;
    }

    const visibility = normalizeVisibility((input as any).visibility);

    // 1. Résoudre/créer les skills et interests AVANT (hors transaction)
    let skillIds: string[] = [];
    let interestIds: string[] = [];

    if (input.skills && input.skills.length > 0) {
      const skillSlugs = input.skills.filter(Boolean);
      skillIds = await this.taxonomy.resolveSkillSlugs(skillSlugs);
    }

    if (input.interests && input.interests.length > 0) {
      const interestSlugs = input.interests.filter(Boolean);
      interestIds = await this.taxonomy.resolveInterestSlugs(interestSlugs);
    }

    // Récupérer l'email pour la notification
    const user = (await this.prisma.prisma().users.findUnique({
      where: { id: userId },
      select: { email: true, locale: true },
    }));

    // Envoyer l'email de notification
    await this.mail.sendTemplate(user?.email || "", 'profile_update', user?.locale ?? 'en', {
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
      app_name: this.appName,
    });

    // 2. Mettre à jour le profil
    const profile = await this.prisma.prisma().profiles.upsert({
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

    void this.jobs
      .enqueuePrecomputeProfileMatches(profile.id, MatchDetailLevel.BIDIRECTIONAL, 30)
      .catch((error) => console.warn('Unable to queue profile match precompute', error));

    // 3. Gérer les expériences professionnelles
    if (input.work_experiences !== undefined) {
      const existingIds = input.work_experiences.filter(e => e.id).map(e => e.id!);

      if (existingIds.length > 0) {
        await this.prisma.prisma().work_experiences.deleteMany({
          where: { user_id: userId, id: { notIn: existingIds } },
        });
      } else {
        await this.prisma.prisma().work_experiences.deleteMany({
          where: { user_id: userId },
        });
      }

      for (const exp of input.work_experiences) {
        const data = {
          user_id: userId,
          title: exp.title,
          company: exp.company,
          start_date: new Date(exp.start_date),
          end_date: exp.end_date ? new Date(exp.end_date) : null,
          is_current: exp.is_current,
          description: exp.description,
          location: exp.location,
          updated_at: new Date(),
        };

        if (exp.id) {
          await this.prisma.prisma().work_experiences.update({
            where: { id: exp.id },
            data,
          });
        } else {
          await this.prisma.prisma().work_experiences.create({ data });
        }
      }
    }

    // 4. Gérer les formations
    if (input.educations !== undefined) {
      const existingIds = input.educations.filter(e => e.id).map(e => e.id!);

      if (existingIds.length > 0) {
        await this.prisma.prisma().educations.deleteMany({
          where: { user_id: userId, id: { notIn: existingIds } },
        });
      } else {
        await this.prisma.prisma().educations.deleteMany({
          where: { user_id: userId },
        });
      }

      for (const edu of input.educations) {
        const data = {
          user_id: userId,
          school: edu.school,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          start_date: new Date(edu.start_date),
          end_date: edu.end_date ? new Date(edu.end_date) : null,
          is_current: edu.is_current,
          grade: edu.grade,
          description: edu.description,
          updated_at: new Date(),
        };

        if (edu.id) {
          await this.prisma.prisma().educations.update({
            where: { id: edu.id },
            data,
          });
        } else {
          await this.prisma.prisma().educations.create({ data });
        }
      }
    }

    // 5. Gérer les expériences de bénévolat
    if (input.volunteer_experiences !== undefined) {
      const existingIds = input.volunteer_experiences.filter(e => e.id).map(e => e.id!);

      if (existingIds.length > 0) {
        await this.prisma.prisma().volunteer_experiences.deleteMany({
          where: { user_id: userId, id: { notIn: existingIds } },
        });
      } else {
        await this.prisma.prisma().volunteer_experiences.deleteMany({
          where: { user_id: userId },
        });
      }

      for (const exp of input.volunteer_experiences) {
        const data = {
          user_id: userId,
          title: exp.title,
          organization: exp.organization,
          start_date: new Date(exp.start_date),
          end_date: exp.end_date ? new Date(exp.end_date) : null,
          is_current: exp.is_current,
          cause: exp.cause,
          description: exp.description,
          updated_at: new Date(),
        };

        if (exp.id) {
          await this.prisma.prisma().volunteer_experiences.update({
            where: { id: exp.id },
            data,
          });
        } else {
          await this.prisma.prisma().volunteer_experiences.create({ data });
        }
      }
    }

    // 6. Mettre à jour les relations skills
    if (input.skills !== undefined) {
      await this.prisma.prisma().user_skills.deleteMany({
        where: { user_id: userId }
      });

      if (skillIds.length > 0) {
        await this.prisma.prisma().user_skills.createMany({
          data: skillIds.map((skill_id: string) => ({
            user_id: userId,
            skill_id
          })),
          skipDuplicates: true
        });
      }
    }

    // 7. Mettre à jour les relations interests
    if (input.interests !== undefined) {
      await this.prisma.prisma().user_interests.deleteMany({
        where: { user_id: userId }
      });

      if (interestIds.length > 0) {
        await this.prisma.prisma().user_interests.createMany({
          data: interestIds.map((interest_id: any) => ({
            user_id: userId,
            interest_id
          })),
          skipDuplicates: true
        });
      }
    }

    return profile;
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
    throw AppError.forbidden('not.allowed');
  }

  async listWorkExperiences(userId: string) {
    return this.prisma.prisma().work_experiences.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_current: 'desc' },
        { start_date: 'desc' },
        { updated_at: 'desc' },
      ],
    });
  }

  async listEducations(userId: string) {
    return this.prisma.prisma().educations.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_current: 'desc' },
        { start_date: 'desc' },
        { updated_at: 'desc' },
      ],
    });
  }

  async listVolunteerExperiences(userId: string) {
    return this.prisma.prisma().volunteer_experiences.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_current: 'desc' },
        { start_date: 'desc' },
        { updated_at: 'desc' },
      ],
    });
  }
}
