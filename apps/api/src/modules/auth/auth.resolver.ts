import { Args, Mutation, Query, Resolver, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { TokensOutput } from './dto/tokens.output';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { GqlRefreshGuard } from './guards/gql-refresh.guard';
import { CurrentUser, JwtUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const isProd = process.env.NODE_ENV === 'production';
const sameSite = isProd ? 'none' : 'lax' as const;

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

    ctx.res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/',
      maxAge: 15 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    ctx.res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return { accessToken, refreshToken };
  }

  @Mutation(() => TokensOutput, { description: 'Refresh depuis cookie (rotate)' })
  @UseGuards(GqlRefreshGuard)
  async refresh(@CurrentUser() user: JwtUser, @Context() ctx: any): Promise<TokensOutput> {
    if (!user?.sub || !user?.jti) throw new Error('Invalid refresh payload');
    const { accessToken, refreshToken } = await this.auth.refresh(user.sub, user.jti, String(user.role || 'user'));

    // Réécriture (rotation) des cookies
    ctx.res.cookie('access_token', accessToken, {
      httpOnly: true, secure: isProd, sameSite, path: '/', maxAge: 15 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    ctx.res.cookie('refresh_token', refreshToken, {
      httpOnly: true, secure: isProd, sameSite, path: '/', maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return { accessToken, refreshToken };
  }

  @Mutation(() => Boolean, { description: 'Logout (revoke + clear cookies)' })
  @UseGuards(GqlRefreshGuard)
  async logout(@CurrentUser() user: JwtUser, @Context() ctx: any): Promise<boolean> {
    if (user?.jti) await this.auth.logout(user.jti);

    ctx.res.clearCookie('access_token', {
      httpOnly: true, secure: isProd, sameSite, path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    ctx.res.clearCookie('refresh_token', {
      httpOnly: true, secure: isProd, sameSite, path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return true;
  }

  @Query(() => String, { description: 'Who am I (requires access cookie)' })
  @UseGuards(GqlAuthGuard)
  async whoami(@CurrentUser() user: JwtUser) {
    return `${user.sub}:${user.role}`;
  }

  @Query(() => String, { description: 'Admin-only example' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  async adminOnly() { return 'secret-for-admins'; }

  @Query(() => String, { description: 'Profile email (via RLS)' })
  @UseGuards(GqlAuthGuard)
  async myEmail(@CurrentUser() user: JwtUser) {
    const me = await this.auth.me(user.sub);
    return me?.email ?? '';
  }
}
