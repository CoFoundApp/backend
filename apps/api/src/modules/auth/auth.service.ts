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
  private accessTtl = process.env.JWT_ACCESS_TTL || '15m';
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
    console.log('🔄 Refresh attempt:', { userId, jti, role, timestamp: new Date().toISOString() });

    const key = `rt:${jti}`;
    const storedUserId = await this.redis.get(key);
    const ttl = await this.redis.ttl(key);

    console.log('🔍 Redis check:', {
      key,
      storedUserId,
      expectedUserId: userId,
      found: !!storedUserId,
      match: storedUserId === userId,
      ttl: ttl > 0 ? `${ttl}s (${(ttl / 86400).toFixed(2)} days)` : ttl === -1 ? 'no expiration' : 'not found'
    });

    if (!storedUserId) {
      console.log('❌ Refresh token NOT FOUND in Redis (expired or never existed)');
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (storedUserId !== userId) {
      console.log('❌ Refresh token user mismatch (possible token reuse attack)');
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }

    // Supprime l'ancien token (rotation)
    await this.redis.del(key);
    console.log('🗑️ Old refresh token deleted from Redis');

    // Génère de nouveaux tokens
    const newTokens = await this.issueTokens(userId, role);
    console.log('✅ New tokens issued successfully');

    return newTokens;
  }

  async logout(jti: string) {
    const key = `rt:${jti}`;

    const exists = await this.redis.get(key);

    if (!exists) {
      console.log('⚠️ Warning: Token was already missing from Redis');
    }

    const result = await this.redis.del(key);

    const stillExists = await this.redis.get(key);

    return true;
  }

  // --- helpers ---
  private async issueTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      this.accessSecret,
      { expiresIn: this.accessTtl } as SignOptions
    );

    const jti = randomUUID();
    const refreshToken = jwt.sign(
      { sub: userId, role, jti },
      this.refreshSecret,
      { expiresIn: this.refreshTtl } as SignOptions
    );

    const key = `rt:${jti}`;
    await this.redis.setex(key, this.refreshTtlSec, userId);

    return { accessToken, refreshToken };
  }
}
