import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AutoTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  private slugToName(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async resolveSlugs(
    slugs: string[],
    type: 'skills' | 'interests',
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    if (!slugs?.length) return [];

    const client = tx ?? this.prisma.prisma();

    const createdIds: string[] = [];
    for (const slug of slugs) {
      if (!slug) continue;
      try {
        const delegate = type === 'skills' ? (client as any).skills : (client as any).interests;
        let record = await delegate.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!record) {
          try {
            record = await delegate.create({
              data: {
                name: this.slugToName(slug),
                slug,
                category: 'Auto-generated',
              },
              select: { id: true },
            });
          } catch (error: any) {
            if (error?.code === 'P2002') {
              record = await delegate.findUnique({
                where: { slug },
                select: { id: true },
              });
            } else {
              console.warn(`❌ Failed to create ${type.slice(0, -1)} "${slug}":`, error);
            }
          }
        }

        if (record) {
          createdIds.push(record.id);
        }
      } catch (error) {
        console.warn(`❌ Error resolving ${type.slice(0, -1)} "${slug}":`, error);
      }
    }

    return createdIds;
  }

  resolveSkillSlugs(slugs: string[], tx?: Prisma.TransactionClient) {
    return this.resolveSlugs(slugs, 'skills', tx);
  }

  resolveInterestSlugs(slugs: string[], tx?: Prisma.TransactionClient) {
    return this.resolveSlugs(slugs, 'interests', tx);
  }
}
