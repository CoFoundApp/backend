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


@Resolver(() => Profile)
export class ProfileResolver {
  constructor(
    private readonly profiles: ProfileService,
    @Inject(forwardRef(() => UserService))
    private readonly users: UserService,
    private readonly skillsService: SkillsService,
    private readonly interestsService: InterestsService,
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
  async updateMyProfile(
    @CurrentUser() user: JwtUser,
    @Args('input') input: UpdateMyProfileInput,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.profiles.updateMyProfile(user.sub, input);
  }

  /** Résout le user associé au profil */
  @ResolveField(() => User)
  async user(@Parent() profile: Profile) {
    return this.users.findById(profile.user_id);
  }

  @ResolveField(() => [Skill])
  async skills(@Parent() profile: Profile) {
    // pivot lié à users → on interroge par user_id
    return this.skillsService.listByUser(profile.user_id);
  }

  @ResolveField(() => [Interest])
  async interests(@Parent() profile: Profile) {
    return this.interestsService.listByUser(profile.user_id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async updateMySkills(@CurrentUser() user: JwtUser, @Args('input') input: UpdateMySkillsInput) {
    if (!user) throw new UnauthorizedException();
    // pas besoin de l'id du profil, le pivot est sur user_id
    await this.skillsService.attachToUser(user.sub, input.addIds ?? [], input.removeIds ?? []);
    return true;
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async updateMyInterests(@CurrentUser() user: JwtUser, @Args('input') input: UpdateMyInterestsInput) {
    if (!user) throw new UnauthorizedException();
    await this.interestsService.attachToUser(user.sub, input.addIds ?? [], input.removeIds ?? []);
    return true;
  }
}
