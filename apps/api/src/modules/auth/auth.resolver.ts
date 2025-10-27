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
import { CompleteTwoFactorInput } from './dto/complete-two-factor.input';
import { TwoFactorSetupOutput } from './dto/two-factor-setup.output';
import { TwoFactorBackupCodesOutput } from './dto/two-factor-backup-codes.output';
import { TwoFactorStatusOutput } from './dto/two-factor-status.output';
import { ActivateTwoFactorInput } from './dto/activate-two-factor.input';
import { DisableTwoFactorInput } from './dto/disable-two-factor.input';
import { RegenerateTwoFactorCodesInput } from './dto/regenerate-two-factor-codes.input';
import { RequestEmailChangeInput } from './dto/request-email-change.input';
import { OAuthProvider } from './dto/oauth-provider.enum';
import { OAuthUrlOutput } from './dto/oauth-url.output';
import { OAuthService } from './oauth.service';
import { CompleteOAuthInput } from './dto/complete-oauth.input';
import { RequestPasswordResetInput } from './dto/request-password-reset.input';
import { ResetPasswordInput } from './dto/reset-password.input';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OAuthService,
  ) {}

  @Mutation(() => TokensOutput, { description: 'Create account + tokens' })
  async signup(@Args('input') input: SignupInput, @Context() ctx: any): Promise<TokensOutput> {
    const result = await this.auth.signup(input);
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(ctx.res, ctx.req, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return result;
  }

  @Mutation(() => TokensOutput, { description: 'Login + set cookies' })
  async login(@Args('input') input: LoginInput, @Context() ctx: any): Promise<TokensOutput> {
    const result = await this.auth.login(input);
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(ctx.res, ctx.req, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return result;
  }

  @Mutation(() => TokensOutput, { description: 'Refresh depuis cookie (rotate)' })
  @UseGuards(GqlRefreshGuard)
  async refresh(@CurrentUser() user: JwtUser, @Context() ctx: any): Promise<TokensOutput> {
    const sub = user?.sub;
    const jti = user?.jti;
    if (!sub || !jti) throw new Error('Invalid refresh payload');

    const result = await this.auth.refresh(sub, jti, String(user.role ?? 'user'));

    if (result.accessToken && result.refreshToken) {
      const setCookies = buildAuthSetCookies(ctx.req, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      setCookies.forEach((c: any) => ctx.res.append('Set-Cookie', c));
    }

    return result;
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

  @Mutation(() => TokensOutput, { description: 'Complete two-factor login using code or backup code' })
  async completeTwoFactorLogin(
    @Args('input') input: CompleteTwoFactorInput,
    @Context() ctx: any,
  ): Promise<TokensOutput> {
    const result = await this.auth.completeTwoFactorLogin(input);
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(ctx.res, ctx.req, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return result;
  }

  @Mutation(() => TwoFactorSetupOutput)
  @UseGuards(SessionGuard)
  async generateTwoFactorSetup(@CurrentUser() user: JwtUser): Promise<TwoFactorSetupOutput> {
    return this.auth.generateTwoFactorSetup(user.sub);
  }

  @Mutation(() => TwoFactorBackupCodesOutput)
  @UseGuards(SessionGuard)
  async activateTwoFactor(
    @CurrentUser() user: JwtUser,
    @Args('input') input: ActivateTwoFactorInput,
  ): Promise<TwoFactorBackupCodesOutput> {
    return this.auth.activateTwoFactor(user.sub, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(SessionGuard)
  async disableTwoFactor(
    @CurrentUser() user: JwtUser,
    @Args('input') input: DisableTwoFactorInput,
  ): Promise<boolean> {
    return this.auth.disableTwoFactor(user.sub, input);
  }

  @Mutation(() => TwoFactorBackupCodesOutput)
  @UseGuards(SessionGuard)
  async regenerateTwoFactorBackupCodes(
    @CurrentUser() user: JwtUser,
    @Args('input') input: RegenerateTwoFactorCodesInput,
  ): Promise<TwoFactorBackupCodesOutput> {
    return this.auth.regenerateTwoFactorCodes(user.sub, input);
  }

  @Query(() => TwoFactorStatusOutput)
  @UseGuards(SessionGuard)
  async twoFactorStatus(@CurrentUser() user: JwtUser): Promise<TwoFactorStatusOutput> {
    return this.auth.getTwoFactorStatus(user.sub);
  }

  @Mutation(() => Boolean)
  @UseGuards(SessionGuard)
  async requestEmailVerification(
    @CurrentUser() user: JwtUser,
    @Args('locale', { type: () => String, nullable: true }) locale?: string,
  ): Promise<boolean> {
    return this.auth.requestEmailVerification(user.sub, locale ?? 'en');
  }

  @Mutation(() => Boolean)
  @UseGuards(SessionGuard)
  async requestEmailChange(
    @CurrentUser() user: JwtUser,
    @Args('input') input: RequestEmailChangeInput,
  ): Promise<boolean> {
    return this.auth.requestEmailChange(user.sub, input.email, input.locale ?? 'en');
  }

  @Mutation(() => Boolean)
  async verifyEmail(@Args('token') token: string): Promise<boolean> {
    return this.auth.verifyEmail(token);
  }

  @Mutation(() => Boolean)
  async requestPasswordReset(@Args('input') input: RequestPasswordResetInput): Promise<boolean> {
    await this.auth.requestPasswordReset(input.email, input.locale ?? 'en');
    return true;
  }

  @Mutation(() => Boolean)
  async resetPassword(@Args('input') input: ResetPasswordInput): Promise<boolean> {
    return this.auth.resetPassword(input.token, input.password);
  }

  @Mutation(() => OAuthUrlOutput)
  async startOAuth(
    @Args('provider', { type: () => OAuthProvider }) provider: OAuthProvider,
    @Args('redirectUri') redirectUri: string,
  ): Promise<OAuthUrlOutput> {
    const { url } = await this.oauth.createAuthorizationUrl(provider, redirectUri);
    return { url };
  }

  @Mutation(() => TokensOutput, {
    description: 'Complete OAuth login with authorization code returned by the provider',
  })
  async completeOAuth(
    @Args('input') input: CompleteOAuthInput,
    @Context() ctx: any,
  ): Promise<TokensOutput> {
    const params: Record<string, string | undefined> = {
      code: input.code,
      state: input.state,
      id_token: input.idToken,
    };

    const { profile } = await this.oauth.consumeAuthorizationCode(input.provider, params);
    const result = await this.auth.loginWithOAuth(profile);

    if (result.accessToken && result.refreshToken) {
      setAuthCookies(ctx.res, ctx.req, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } else {
      clearAuthCookies(ctx.res, ctx.req);
    }

    return result;
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
