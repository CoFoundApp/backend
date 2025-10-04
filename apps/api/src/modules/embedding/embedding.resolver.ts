import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SkillMatch } from './types/skill-match.type';
import { InterestMatch } from './types/interest-match.type';
import { ProfileEmbeddingService } from './profile-embedding.service';

@Resolver()
export class EmbeddingResolver {
  constructor(
    private readonly svc: EmbeddingService,
    private readonly profileEmb: ProfileEmbeddingService,
  ) {}

  // --- ADMIN: forcer calcul embedding ---
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, {description: "Forcer le calcul de l'embedding de compétence"})
  async computeSkillEmbedding(@Args('id', { type: () => String }) id: string) {
    return this.svc.computeAndStoreForSkill(id);
  }

  // --- ADMIN: forcer calcul embedding ---
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, {description: "Forcer le calcul de l'embedding d'intérêt"})
  async computeInterestEmbedding(@Args('id', { type: () => String }) id: string) {
    return this.svc.computeAndStoreForInterest(id);
  }

  // --- ADMIN/DEV: recherche sémantique par texte (pas d’exposition du vecteur) ---
  // NB: n’expose pas embedding
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => [SkillMatch], {description: "Recherche sémantique de compétences par texte"})
  async searchSkillsByText(
    @Args('text', { type: () => String }) text: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number,
  ) {
    const rows = await this.svc.searchSkillsByText(text, limit ?? 10);
    return rows.map((r) => ({ item: { id: r.id, name: r.name, category: r.category, slug: r.slug }, distance: r.distance }));
  }

  // --- ADMIN/DEV: recherche sémantique par texte (pas d’exposition du vecteur) ---
  // NB: n’expose pas embedding
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => [InterestMatch], {description: "Recherche sémantique d'intérêts par texte"})
  async searchInterestsByText(
    @Args('text', { type: () => String }) text: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number,
  ) {
    const rows = await this.svc.searchInterestsByText(text, limit ?? 10);
    return rows.map((r) => ({ item: { id: r.id, name: r.name, category: r.category, slug: r.slug }, distance: r.distance }));
  }

  // --- ADMIN: forcer recalcul de l'embedding de profil ---
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean, {description: "Forcer le recalcul de l'embedding de profil"})
  adminRecomputeProfileEmbedding(@Args('userId', { type: () => String }) userId: string) {
    return this.profileEmb.recomputeForUser(userId);
  }
}
