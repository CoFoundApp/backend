import { Resolver, Query, Args, Mutation, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException, forwardRef, Inject } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Profile } from './profile.type';
import { ProfileService } from './profile.service';
import { UpdateMyProfileInput } from './dto/update-my-profile.input';
import { User } from '../user/user.type';
import { UserService } from '../user/user.service';
import { Skill } from '../taxonomy/types/skill.type';
import { Interest } from '../taxonomy/types/interest.type';
import { SkillsService } from '../taxonomy/skills.service';
import { InterestsService } from '../taxonomy/interests.service';
import { UpdateMySkillsInput } from '../taxonomy/dto/update-my-skills.input';
import { UpdateMyInterestsInput } from '../taxonomy/dto/update-my-interests.input';
import { ProfileEmbeddingService } from '../embedding/profile-embedding.service';
import { JobsService } from '../../queue/jobs.service';
import { Logger } from '@nestjs/common';


@Resolver(() => Profile)
export class ProfileResolver {
    private readonly logger = new Logger(ProfileResolver.name);
  constructor(
    private readonly profiles: ProfileService,
    @Inject(forwardRef(() => UserService))
    private readonly users: UserService,
    private readonly skillsService: SkillsService,
    private readonly interestsService: InterestsService,
    private readonly profileEmbedding: ProfileEmbeddingService,
    private readonly jobs: JobsService,
  ) {}

  /** Public: lecture d'un profil public/unlisted par id */
  @Query(() => Profile, { nullable: true })
  async profileById(@Args('id', { type: () => String }) id: string) {
    return this.profiles.getPublicProfileById(id);
  }

  /** Admin: listing des profils */
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Query(() => [Profile])
  async adminListProfiles(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
  ) {
    return this.profiles.adminListProfiles(limit ?? 50);
  }

  /** Moi: lire mon profil (créé s'il n'existe pas) */
  @UseGuards(GqlAuthGuard)
  @Query(() => Profile)
  async myProfile(@CurrentUser() user: JwtUser) {
    if (!user) throw new UnauthorizedException();
    return this.profiles.ensureMyProfile(user.sub);
  }

  /** Moi: mise à jour de mon profil */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Profile)
  async updateMyProfile(@CurrentUser() user: JwtUser, @Args('input') input: UpdateMyProfileInput) {
    if (!user) throw new UnauthorizedException();
    const p = await this.profiles.updateMyProfile(user.sub, input);

    await this.jobs.enqueueRecomputeProfileDebounced(user.sub);

    this.logger.log(`enqueue done`);
    return p;
  }

  /** Résout le user associé au profil */
  @ResolveField(() => User)
  async user(@Parent() profile: Profile) {
    return this.users.findById(profile.user_id);
  }

  // Résout les skills associés au profil
  @ResolveField(() => [Skill])
  async skills(@Parent() profile: Profile) {
    return this.skillsService.listByUser(profile.user_id);
  }

  // Résout les intérêts associés au profil
  @ResolveField(() => [Interest])
  async interests(@Parent() profile: Profile) {
    return this.interestsService.listByUser(profile.user_id);
  }

  // Mise à jour de mes compétences
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async updateMySkills(@CurrentUser() user: JwtUser, @Args('input') input: UpdateMySkillsInput) {
    if (!user) throw new UnauthorizedException();

    await this.skillsService.attachToUser(user.sub, input.addIds ?? [], input.removeIds ?? []);
    await this.profileEmbedding.recomputeForUser(user.sub);
    return true;
  }

  // Mise à jour de mes intérêts
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async updateMyInterests(@CurrentUser() user: JwtUser, @Args('input') input: UpdateMyInterestsInput) {
    if (!user) throw new UnauthorizedException();
    await this.interestsService.attachToUser(user.sub, input.addIds ?? [], input.removeIds ?? []);
    await this.profileEmbedding.recomputeForUser(user.sub);
    return true;
  }

  // Admin: s'assurer qu'un profil existe
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean)
  adminEnsureProfile(@Args('userId', { type: () => String }) userId: string) {
    return this.profiles.ensureMyProfile(userId).then(() => true);
  }

  // Admin: Changer la visibilité d'un profil
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean)
  adminSetProfileVisibility(
    @Args('userId', { type: () => String }) userId: string,
    @Args('visibility', { type: () => String }) visibility: string,
  ) {
    return this.profiles.updateMyProfile(userId, { visibility } as any).then(() => true);
  }
}
