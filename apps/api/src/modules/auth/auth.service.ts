import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import type Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS } from '../../infra/redis/redis.module';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

function parseTTLToSeconds(str: string | undefined, defSeconds: number): number {
  if (!str) return defSeconds;
  const m = String(str).trim().match(/^(\d+)([smhd])$/i);
  if (!m) return defSeconds;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return defSeconds;
  }
}

@Injectable()
export class AuthService {
  private accessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access';
  private refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh';
  private accessTtl = process.env.JWT_ACCESS_TTL || '900s';
  private refreshTtl = process.env.JWT_REFRESH_TTL || '30d';
  private refreshTtlSec = parseTTLToSeconds(this.refreshTtl, 30 * 86400);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: TemplateMailerService,
  ) {}

  async signup(input: SignupInput) {
    const email = input.email.trim().toLowerCase();
    const exists = await this.prisma.prisma().users.findUnique({ where: { email } }).catch(() => null);
    if (exists) throw new ConflictException('Email already registered');

    const password_hash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.prisma().users.create({
      data: {
        email,
        password_hash,
        role: 'user',
      },
    });

    await this.mail.sendTemplate(user.email, 'welcome', 'en', {
      email: user.email,
      app_name: process.env.BRAND_NAME || 'My App',
    });

    return this.issueTokens(user.id, String(user.role || 'user'));
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.prisma().users.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, String(user.role || 'user'));
  }

  async me(userId: string) {
    return this.prisma.withUserContext(userId, null, (tx) =>
      tx.users.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, created_at: true },
      }),
    );
  }

  async refresh(userId: string, jti: string, role: string) {
    // Vérifie que le refresh JTI est encore valide dans Redis
    const key = `rt:${jti}`;
    const val = await this.redis.get(key);
    if (val !== userId) throw new UnauthorizedException('Refresh token revoked');
    await this.redis.del(key);
    return this.issueTokens(userId, role);
  }

  async logout(jti: string) {
    await this.redis.del(`rt:${jti}`);
    return true;
  }

  // --- helpers ---
  private async issueTokens(userId: string, role: string) {
    const accessToken = jwt.sign({ sub: userId, role }, this.accessSecret, {
      expiresIn: parseTTLToSeconds(this.accessTtl, 900),
    } as SignOptions);

    const jti = randomUUID();
    const refreshToken = jwt.sign({ sub: userId, role, jti }, this.refreshSecret, {
      expiresIn: parseTTLToSeconds(this.refreshTtl, 30 * 86400),
    } as SignOptions);

    // allowlist du refresh dans Redis (TTL)
    await this.redis.setex(`rt:${jti}`, this.refreshTtlSec, userId);

    return { accessToken, refreshToken };
  }
}
