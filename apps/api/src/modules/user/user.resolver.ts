import { Resolver, Query, Args, Mutation, Int, ResolveField, Parent } from '@nestjs/graphql';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { UserService } from './user.service';
import { User } from './user.type';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Profile } from '../profile/profile.type';
import { ProfileService } from '../profile/profile.service';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly users: UserService,
    @Inject(forwardRef(() => ProfileService))
    private readonly profiles: ProfileService,
  ) {}

  /** Admin: liste des utilisateurs */
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Query(() => [User], { description: 'Admin: liste des utilisateurs' })
  async listUsers(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
  ) {
    return this.users.listUsers(limit ?? 50);
  }

  @Mutation(() => User, { description: 'Admin: création utilisateur' })
  async createUser(@Args('input') input: CreateUserInput) {
    return this.users.createUser(input.email, input.password, input.role, input.status);
  }

  /** Admin: mise à jour utilisateur */
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => User, { description: 'Admin: mise à jour role/status' })
  async updateUser(@Args('input') input: UpdateUserInput) {
    return this.users.updateUser(input.id, input.role, input.status);
  }

  /** Résout le profil associé à l'utilisateur */
  @ResolveField(() => Profile, { nullable: true, description: "Le profil de l'utilisateur" })
  async profile(@Parent() user: User) {
    return this.profiles.getMyProfile(user.id);
  }
}
