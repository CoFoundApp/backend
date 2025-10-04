import { Args, Mutation, Query, Resolver, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { TokensOutput } from './dto/tokens.output';
import { SessionGuard } from './guards/session.guard';
import { GqlRefreshGuard } from './guards/gql-refresh.guard';
import { CurrentUser, JwtUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { buildAuthSetCookies, clearAuthCookies, setAuthCookies } from '../../common/utils/cookies.util';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => TokensOutput, { description: 'Create account + tokens' })
  async signup(@Args('input') input: SignupInput): Promise<TokensOutput> {
    return this.auth.signup(input);
  }

  @Mutation(() => TokensOutput, { description: 'Login + set cookies' })
  async login(@Args('input') input: LoginInput, @Context() ctx: any): Promise<TokensOutput> {

    const { accessToken, refreshToken } = await this.auth.login(input);

    setAuthCookies(ctx.res, ctx.req, { accessToken, refreshToken });

    return { accessToken, refreshToken };
  }

  @Mutation(() => TokensOutput, { description: 'Refresh depuis cookie (rotate)' })
  @UseGuards(GqlRefreshGuard)
  async refresh(@CurrentUser() user: JwtUser, @Context() ctx: any): Promise<TokensOutput> {
    const sub = user?.sub;
    const jti = user?.jti;
    if (!sub || !jti) throw new Error('Invalid refresh payload');

    const { accessToken, refreshToken } = await this.auth.refresh(sub, jti, String(user.role ?? 'user'));

    const setCookies = buildAuthSetCookies(ctx.req, { accessToken, refreshToken });
    setCookies.forEach((c: any) => ctx.res.append('Set-Cookie', c));

    return { accessToken, refreshToken };
  }

  @Mutation(() => Boolean)
  @UseGuards(SessionGuard)
  async logout(@CurrentUser() user: JwtUser, @Context() ctx: any): Promise<boolean> {
    try {
      if (user?.jti) {
        await this.auth.logout(user.jti);
      }
      clearAuthCookies(ctx.res, ctx.req);
      return true;
    } catch (error) {
      clearAuthCookies(ctx.res, ctx.req);
      return true;
    }
  }

  @Query(() => String, { description: 'Who am I (requires access cookie)' })
  @UseGuards(SessionGuard)
  async whoami(@CurrentUser() user: JwtUser) {
    return `${user.sub}:${user.role}`;
  }

  @Query(() => String, { description: 'Admin-only example' })
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  async adminOnly() {
    return 'secret-for-admins';
  }

  @Query(() => String, { description: 'Profile email (via RLS)' })
  @UseGuards(SessionGuard)
  async myEmail(@CurrentUser() user: JwtUser) {
    const me = await this.auth.me(user.sub);
    return me?.email ?? '';
  }
}
