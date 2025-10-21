import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import type Redis from 'ioredis';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { TokensOutput } from './dto/tokens.output';
import { CompleteTwoFactorInput } from './dto/complete-two-factor.input';
import { ActivateTwoFactorInput } from './dto/activate-two-factor.input';
import { DisableTwoFactorInput } from './dto/disable-two-factor.input';
import { RegenerateTwoFactorCodesInput } from './dto/regenerate-two-factor-codes.input';
import { TwoFactorSetupOutput } from './dto/two-factor-setup.output';
import { TwoFactorBackupCodesOutput } from './dto/two-factor-backup-codes.output';
import { TwoFactorStatusOutput } from './dto/two-factor-status.output';
import { REDIS } from '../../infra/redis/redis.module';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { EmailVerificationService } from './email-verification.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthProfile } from './oauth.service';

function parseTTLToSeconds(str: string | undefined, defSeconds: number): number {
  if (!str) return defSeconds;
  const m = String(str).trim().match(/^(\d+)([smhd])$/i);
  if (!m) return defSeconds;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return defSeconds;
  }
}

@Injectable()
export class AuthService {
  private accessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access';
  private refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh';
  private accessTtl = process.env.JWT_ACCESS_TTL || '15m';
  private refreshTtl = process.env.JWT_REFRESH_TTL || '30d';
  private refreshTtlSec = parseTTLToSeconds(this.refreshTtl, 30 * 86400);
  private bcryptRounds = Number(process.env.SECURITY_BCRYPT_ROUNDS ?? 12);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: TemplateMailerService,
    private readonly emailVerification: EmailVerificationService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async signup(input: SignupInput): Promise<TokensOutput> {
    const email = input.email.trim().toLowerCase();
    const locale = input.locale ?? 'en';
    const exists = await this.prisma
      .prisma()
      .users.findUnique({ where: { email } })
      .catch(() => null);
    if (exists) throw new ConflictException('Email already registered');

    const password_hash = await bcrypt.hash(input.password, this.bcryptRounds);
    const user = await this.prisma.prisma().users.create({
      data: {
        email,
        password_hash,
        role: 'user',
      },
    });

    await this.mail.sendTemplate(user.email, 'welcome', locale, {
      email: user.email,
      app_name: process.env.BRAND_NAME || 'CoFound',
    });

    await this.emailVerification.sendVerificationEmail(user.id, user.email, locale, {
      reason: 'signup',
    });

    const tokens = await this.issueTokens(user.id, String(user.role || 'user'));
    return {
      ...tokens,
      requiresTwoFactor: false,
      emailVerificationRequired: true,
    };
  }

  async login(input: LoginInput): Promise<TokensOutput> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.prisma().users.findUnique({
      where: { email },
      include: {
        security_settings: {
          select: { totp_enabled: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.handlePostAuthentication(user, {
      twoFactorCode: input.twoFactorCode,
      twoFactorBackupCode: input.twoFactorBackupCode,
    });
  }

  async loginWithOAuth(profile: OAuthProfile): Promise<TokensOutput> {
    const provider = profile.provider;
    const providerUserId = profile.providerUserId;
    const email = profile.email.toLowerCase();

    const identity = await this.prisma.prisma().auth_identities.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
      include: {
        users: {
          include: {
            security_settings: {
              select: { totp_enabled: true },
            },
          },
        },
      },
    });

    let user = identity?.users ?? null;

    if (!user) {
      user = await this.prisma.prisma().users.findUnique({
        where: { email },
        include: {
          security_settings: {
            select: { totp_enabled: true },
          },
        },
      });
    }

    if (!user) {
      const password_hash = await bcrypt.hash(randomBytes(32).toString('hex'), this.bcryptRounds);
      user = await this.prisma.prisma().users.create({
        data: {
          email,
          password_hash,
          role: 'user',
          email_verified_at: profile.emailVerified ? new Date() : null,
        },
        include: {
          security_settings: {
            select: { totp_enabled: true },
          },
        },
      });

      await this.mail.sendTemplate(user.email, 'welcome', 'en', {
        email: user.email,
        app_name: process.env.BRAND_NAME || 'CoFound',
      });
    }

    await this.prisma.prisma().auth_identities.upsert({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
      create: {
        provider,
        provider_user_id: providerUserId,
        user_id: user.id,
        email,
      },
      update: {
        email,
      },
    });

    if (profile.emailVerified && !user.email_verified_at) {
      await this.prisma.prisma().users.update({
        where: { id: user.id },
        data: { email_verified_at: new Date(), pending_email: null },
      });
      user.email_verified_at = new Date();
    }

    if (!profile.emailVerified && !user.email_verified_at) {
      await this.emailVerification.sendVerificationEmail(user.id, user.email, 'en', { reason: 'signup' });
    }

    return this.handlePostAuthentication(user, {});
  }

  async completeTwoFactorLogin(input: CompleteTwoFactorInput): Promise<TokensOutput> {
    const userId = await this.twoFactor.consumeChallenge(input.token);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired two-factor session');
    }

    const user = await this.prisma.prisma().users.findUnique({
      where: { id: userId },
      include: {
        security_settings: {
          select: { totp_enabled: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const enabled = await this.twoFactor.isEnabled(user.id);
    if (!enabled) {
      throw new UnauthorizedException('Two-factor authentication is not enabled');
    }

    if (input.code) {
      const valid = await this.twoFactor.verifyTotp(user.id, input.code);
      if (!valid) throw new UnauthorizedException('Invalid two-factor code');
    } else if (input.backupCode) {
      const valid = await this.twoFactor.verifyBackupCode(user.id, input.backupCode);
      if (!valid) throw new UnauthorizedException('Invalid backup code');
    } else {
      throw new BadRequestException('Two-factor verification code required');
    }

    return this.buildTokenResponse(user.id, String(user.role || 'user'), !!user.email_verified_at);
  }

  async generateTwoFactorSetup(userId: string): Promise<TwoFactorSetupOutput> {
    const user = await this.prisma.prisma().users.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.email_verified_at) {
      throw new ForbiddenException('Verify your email before enabling two-factor authentication');
    }
    return this.twoFactor.generateSetup(userId, user.email);
  }

  async activateTwoFactor(userId: string, input: ActivateTwoFactorInput): Promise<TwoFactorBackupCodesOutput> {
    const codes = await this.twoFactor.enable(userId, input.secret, input.code);
    return { codes };
  }

  async disableTwoFactor(userId: string, input: DisableTwoFactorInput): Promise<boolean> {
    const enabled = await this.twoFactor.isEnabled(userId);
    if (!enabled) return true;

    if (input.code) {
      const ok = await this.twoFactor.verifyTotp(userId, input.code);
      if (!ok) throw new UnauthorizedException('Invalid two-factor code');
    } else if (input.backupCode) {
      const ok = await this.twoFactor.verifyBackupCode(userId, input.backupCode);
      if (!ok) throw new UnauthorizedException('Invalid backup code');
    } else {
      throw new BadRequestException('Two-factor verification required');
    }

    await this.twoFactor.disable(userId);
    return true;
  }

  async regenerateTwoFactorCodes(userId: string, input: RegenerateTwoFactorCodesInput): Promise<TwoFactorBackupCodesOutput> {
    const enabled = await this.twoFactor.isEnabled(userId);
    if (!enabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (input.code) {
      const ok = await this.twoFactor.verifyTotp(userId, input.code);
      if (!ok) throw new UnauthorizedException('Invalid two-factor code');
    } else if (input.backupCode) {
      const ok = await this.twoFactor.verifyBackupCode(userId, input.backupCode);
      if (!ok) throw new UnauthorizedException('Invalid backup code');
    } else {
      throw new BadRequestException('Two-factor verification required');
    }

    const codes = await this.twoFactor.regenerateBackupCodes(userId);
    return { codes };
  }

  async getTwoFactorStatus(userId: string): Promise<TwoFactorStatusOutput> {
    const status = await this.twoFactor.getStatus(userId);
    return {
      enabled: status.enabled,
      backupCodesRemaining: status.remaining,
    };
  }

  async requestEmailVerification(userId: string, locale = 'en'): Promise<boolean> {
    const user = await this.prisma.prisma().users.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.pending_email && user.email_verified_at) {
      return true;
    }

    const target = user.pending_email ?? user.email;
    const reason = user.pending_email ? 'change' : 'signup';

    await this.emailVerification.sendVerificationEmail(user.id, target, locale, { reason });
    return true;
  }

  async requestEmailChange(userId: string, newEmail: string, locale = 'en'): Promise<boolean> {
    const target = newEmail.trim().toLowerCase();
    const user = await this.prisma.prisma().users.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.email === target) {
      throw new BadRequestException('This email is already your current email');
    }

    if (user.pending_email?.toLowerCase() === target) {
      await this.emailVerification.sendVerificationEmail(user.id, target, locale, { reason: 'change' });
      return true;
    }

    const exists = await this.prisma.prisma().users.findUnique({ where: { email: target } });
    if (exists) throw new ConflictException('Email already in use');

    await this.prisma.prisma().users.update({
      where: { id: user.id },
      data: {
        pending_email: target,
      },
    });

    await this.emailVerification.sendVerificationEmail(user.id, target, locale, { reason: 'change' });
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    await this.emailVerification.verify(token);
    return true;
  }

  async me(userId: string) {
    return this.prisma.withUserContext(userId, null, (tx) =>
      tx.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          created_at: true,
          email_verified_at: true,
          pending_email: true,
        },
      }),
    );
  }

  async refresh(userId: string, jti: string, role: string): Promise<TokensOutput> {
    const key = `rt:${jti}`;
    const storedUserId = await this.redis.get(key);

    if (!storedUserId) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (storedUserId !== userId) {
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }

    await this.redis.del(key);
    const tokens = await this.issueTokens(userId, role);
    const user = await this.prisma.prisma().users.findUnique({
      where: { id: userId },
      select: { email_verified_at: true },
    });

    return {
      ...tokens,
      requiresTwoFactor: false,
      emailVerificationRequired: !user?.email_verified_at,
    };
  }

  async logout(jti: string) {
    const key = `rt:${jti}`;
    await this.redis.del(key);
    return true;
  }

  private async handlePostAuthentication(
    user: {
      id: string;
      role: any;
      email_verified_at: Date | null;
      security_settings?: { totp_enabled: boolean | null } | null;
    },
    options: { twoFactorCode?: string; twoFactorBackupCode?: string },
  ): Promise<TokensOutput> {
    const role = String(user.role || 'user');
    const emailVerified = !!user.email_verified_at;
    const totpEnabled = user.security_settings?.totp_enabled ?? (await this.twoFactor.isEnabled(user.id));

    if (totpEnabled) {
      if (options.twoFactorCode) {
        const ok = await this.twoFactor.verifyTotp(user.id, options.twoFactorCode);
        if (!ok) throw new UnauthorizedException('Invalid two-factor code');
        return this.buildTokenResponse(user.id, role, emailVerified);
      }
      if (options.twoFactorBackupCode) {
        const ok = await this.twoFactor.verifyBackupCode(user.id, options.twoFactorBackupCode);
        if (!ok) throw new UnauthorizedException('Invalid backup code');
        return this.buildTokenResponse(user.id, role, emailVerified);
      }
      const challenge = await this.twoFactor.createChallenge(user.id);
      return {
        requiresTwoFactor: true,
        twoFactorToken: challenge,
        emailVerificationRequired: !emailVerified,
      };
    }

    return this.buildTokenResponse(user.id, role, emailVerified);
  }

  private async buildTokenResponse(userId: string, role: string, emailVerified: boolean): Promise<TokensOutput> {
    const tokens = await this.issueTokens(userId, role);
    return {
      ...tokens,
      requiresTwoFactor: false,
      emailVerificationRequired: !emailVerified,
    };
  }

  private async issueTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      this.accessSecret,
      { expiresIn: this.accessTtl } as SignOptions,
    );

    const jti = randomUUID();
    const refreshToken = jwt.sign(
      { sub: userId, role, jti },
      this.refreshSecret,
      { expiresIn: this.refreshTtl } as SignOptions,
    );

    const key = `rt:${jti}`;

    await Promise.all([
      this.redis.setex(key, this.refreshTtlSec, userId),
      this.prisma
        .prisma()
        .users.update({
          where: { id: userId },
          data: { last_login_at: new Date() },
        })
        .catch((err) => {
          console.warn('Failed to update last_login_at', err);
        }),
    ]);

    return { accessToken, refreshToken };
  }
}
