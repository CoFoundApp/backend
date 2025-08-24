import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { TokensOutput } from './dto/tokens.output';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { GqlRefreshGuard } from './guards/gql-refresh.guard';
import { CurrentUser, JwtUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => TokensOutput, { description: 'Create account + tokens' })
  async signup(@Args('input') input: SignupInput): Promise<TokensOutput> {
    return this.auth.signup(input);
  }

  @Mutation(() => TokensOutput, { description: 'Login + tokens' })
  async login(@Args('input') input: LoginInput): Promise<TokensOutput> {
    return this.auth.login(input);
  }

  @Mutation(() => TokensOutput, {
    description:
      'Refresh tokens. Envoyer le refresh token via header "x-refresh-token: <token>"',
  })
  @UseGuards(GqlRefreshGuard)
  async refresh(@CurrentUser() user: JwtUser): Promise<TokensOutput> {
    if (!user?.sub || !user?.jti) throw new Error('Invalid refresh payload');
    return this.auth.refresh(user.sub, user.jti, String(user.role || 'user'));
  }

  @Mutation(() => Boolean, { description: 'Logout (revoke refresh jti)' })
  @UseGuards(GqlRefreshGuard)
  async logout(@CurrentUser() user: JwtUser): Promise<boolean> {
    if (!user?.jti) return true;
    return this.auth.logout(user.jti);
  }

  @Query(() => String, { description: 'Who am I (requires access token)' })
  @UseGuards(GqlAuthGuard)
  async whoami(@CurrentUser() user: JwtUser) {
    return `${user.sub}:${user.role}`;
  }

  @Query(() => String, { description: 'Admin-only example' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  async adminOnly() {
    return 'secret-for-admins';
  }

  @Query(() => String, { description: 'Profile email (via RLS)' })
  @UseGuards(GqlAuthGuard)
  async myEmail(@CurrentUser() user: JwtUser) {
    const me = await this.auth.me(user.sub);
    return me?.email ?? '';
  }
}
