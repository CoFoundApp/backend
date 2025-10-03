import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateMyProfileInput } from './dto/update-my-profile.input';
import { ProfileVisibility } from '../../common/enums/domain.enums';
import { mapVisibilityToPrisma } from '../../common/enums/enum-mapper';
import { isUuid } from '../../common/utils/uuid.util';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { PrismaClient } from '@prisma/client';
import { WorkExperienceInput } from './dto/work-experience.input';
import { EducationInput } from './dto/education.input';
import { VolunteerExperienceInput } from './dto/volunteer-experience.input';

type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

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


  private slugToName(slug: string): string {
        return slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
  }

  private async resolveOrCreateSkillSlugs(slugs: string[]): Promise<string[]> {
        if (!slugs?.length) return [];

        const client = this.prisma.prisma() as PrismaClient;
        const createdIds: string[] = [];

        for (const slug of slugs) {
          try {
            let skill = await client.skills.findUnique({
              where: { slug },
              select: { id: true }
            });

            if (!skill) {
              try {
                skill = await client.skills.create({
                  data: {
                    name: this.slugToName(slug),
                    slug: slug,
                    category: 'Auto-generated'
                  },
                  select: { id: true }
                });
              } catch (createError: any) {
                if (createError?.code === 'P2002') {
                  skill = await client.skills.findUnique({
                    where: { slug },
                    select: { id: true }
                  });
                }

                if (!skill) {
                  console.warn(`❌ Failed to create or find skill "${slug}":`, createError);
                  continue;
                }
              }
            }

            if (skill) {
              createdIds.push(skill.id);
            }

          } catch (error) {
            console.warn(`❌ Error processing skill "${slug}":`, error);
            continue;
          }
        }

        return createdIds;
  }

  private async resolveOrCreateInterestSlugs(slugs: string[]): Promise<string[]> {
    if (!slugs?.length) return [];

    const client = this.prisma.prisma() as PrismaClient;
    const createdIds: string[] = [];

    for (const slug of slugs) {
      try {
        let interest = await client.interests.findUnique({
          where: { slug },
          select: { id: true }
        });

        if (!interest) {
          try {
            interest = await client.interests.create({
              data: {
                name: this.slugToName(slug),
                slug: slug,
                category: 'Auto-generated'
              },
              select: { id: true }
         });
              } catch (createError: any) {
                if (createError?.code === 'P2002') {
                  interest = await client.interests.findUnique({
                    where: { slug },
                    select: { id: true }
                  });
                }

                if (!interest) {
                  console.warn(`❌ Failed to create or find interest "${slug}":`, createError);
                  continue;
                }
              }
            }

            if (interest) {
              createdIds.push(interest.id);
            }

          } catch (error) {
            console.warn(`❌ Error processing interest "${slug}":`, error);
            continue;
          }
    }

    return createdIds;
  }

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

    const visibility = normalizeVisibility((input as any).visibility);

    // 1. Résoudre/créer les skills et interests AVANT (hors transaction)
    let skillIds: string[] = [];
    let interestIds: string[] = [];

    if (input.skills && input.skills.length > 0) {
      const skillSlugs = input.skills.filter(Boolean);
      skillIds = await this.resolveOrCreateSkillSlugs(skillSlugs);
    }

    if (input.interests && input.interests.length > 0) {
      const interestSlugs = input.interests.filter(Boolean);
      interestIds = await this.resolveOrCreateInterestSlugs(interestSlugs);
    }

    // Récupérer l'email pour la notification
    const userEmail = (await this.prisma.prisma().users.findUnique({
      where: { id: userId },
      select: { email: true },
    }))?.email;

    // Envoyer l'email de notification
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

  // Fonction pour synchroniser les expériences professionnelles
  private async syncWorkExperiences(
    tx: PrismaTransactionClient,
    userId: string,
    experiences: WorkExperienceInput[]
  ) {
    const existingIds = experiences.filter(e => e.id).map(e => e.id!);

    // Supprimer les expériences qui ne sont plus dans la liste
    if (existingIds.length > 0) {
      await tx.work_experiences.deleteMany({
        where: {
          user_id: userId,
          id: { notIn: existingIds },
        },
      });
    } else {
      await tx.work_experiences.deleteMany({
        where: { user_id: userId },
      });
    }

    // Créer ou mettre à jour les expériences
    for (const exp of experiences) {
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
        await tx.work_experiences.update({
          where: { id: exp.id },
          data,
        });
      } else {
        await tx.work_experiences.create({ data });
      }
    }
  }

  // Fonction pour synchroniser les formations
  private async syncEducations(
    tx: PrismaTransactionClient,
    userId: string,
    educations: EducationInput[]
  ) {
    const existingIds = educations.filter(e => e.id).map(e => e.id!);

    if (existingIds.length > 0) {
      await tx.educations.deleteMany({
        where: {
          user_id: userId,
          id: { notIn: existingIds },
        },
      });
    } else {
      await tx.educations.deleteMany({
        where: { user_id: userId },
      });
    }

    for (const edu of educations) {
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
        await tx.educations.update({
          where: { id: edu.id },
          data,
        });
      } else {
        await tx.educations.create({ data });
      }
    }
  }

  // Fonction pour synchroniser les expériences de bénévolat
  private async syncVolunteerExperiences(
    tx: PrismaTransactionClient,
    userId: string,
    experiences: VolunteerExperienceInput[]
  ) {
    const existingIds = experiences.filter(e => e.id).map(e => e.id!);

    if (existingIds.length > 0) {
      await tx.volunteer_experiences.deleteMany({
        where: {
          user_id: userId,
          id: { notIn: existingIds },
        },
      });
    } else {
      await tx.volunteer_experiences.deleteMany({
        where: { user_id: userId },
      });
    }

    for (const exp of experiences) {
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
        await tx.volunteer_experiences.update({
          where: { id: exp.id },
          data,
        });
      } else {
        await tx.volunteer_experiences.create({ data });
      }
    }
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
