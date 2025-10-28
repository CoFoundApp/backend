import { Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type Redis from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { REDIS } from '../../infra/redis/redis.module';
import { AppError } from '../../common/errors/app-error.factory';

const TFA_CHALLENGE_PREFIX = 'tfa';
const DEFAULT_CHALLENGE_TTL = 300;
const DEFAULT_ENCRYPTION_FALLBACK = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('base64');

authenticator.options = {
  window: 1,
};

@Injectable()
export class TwoFactorService {
  private readonly encryptionKey: Buffer;
  private readonly challengeTtl: number;
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    const rawKey = process.env.TOTP_ENCRYPTION_KEY ?? DEFAULT_ENCRYPTION_FALLBACK;
    const key = Buffer.from(rawKey, 'base64');
    if (key.length !== 32) {
      throw AppError.internal('totp.invalidEncryptionKey');
    }
    this.encryptionKey = key;
    this.challengeTtl = Number(process.env.TWO_FACTOR_CHALLENGE_TTL ?? DEFAULT_CHALLENGE_TTL);
    this.bcryptRounds = Number(process.env.SECURITY_BCRYPT_ROUNDS ?? 12);
  }

  private encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  private decryptSecret(encrypted?: string | null, iv?: string | null, tag?: string | null) {
    if (!encrypted || !iv || !tag) return null;
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private normalizeBackupCode(code: string) {
    return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  private generateBackupCodePair() {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    const compact = raw.slice(0, 8);
    const formatted = `${compact.slice(0, 4)}-${compact.slice(4)}`;
    return { display: formatted, normalized: compact };
  }

  private async withTransaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>) {
    const prisma = this.prisma.prisma();
    if (prisma instanceof PrismaService) {
      return prisma.$transaction(async (tx) => handler(tx));
    }
    return handler(prisma);
  }

  async generateSetup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const issuer = process.env.BRAND_NAME ?? 'CoFound';
    const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
    await this.ensureSettings(userId);
    return { secret, otpAuthUrl };
  }

  async enable(userId: string, secret: string, code: string) {
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw AppError.unauthorized('invalid.two.factor.code');
    }

    const encrypted = this.encryptSecret(secret);
    const codes = Array.from({ length: 10 }, () => this.generateBackupCodePair());
    const hashedCodes = await Promise.all(
      codes.map((pair) => bcrypt.hash(pair.normalized, this.bcryptRounds)),
    );

    await this.withTransaction(async (tx) => {
      await tx.user_security_settings.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          totp_secret_encrypted: encrypted.encrypted,
          totp_secret_iv: encrypted.iv,
          totp_secret_tag: encrypted.tag,
          totp_enabled: true,
        },
        update: {
          totp_secret_encrypted: encrypted.encrypted,
          totp_secret_iv: encrypted.iv,
          totp_secret_tag: encrypted.tag,
          totp_enabled: true,
        },
      });

      await tx.user_totp_backup_codes.deleteMany({ where: { user_id: userId } });
      await tx.user_totp_backup_codes.createMany({
        data: hashedCodes.map((hash) => ({ user_id: userId, code_hash: hash })),
      });
    });

    return codes.map((pair) => pair.display);
  }

  async disable(userId: string) {
    await this.withTransaction(async (tx) => {
      await tx.user_totp_backup_codes.deleteMany({ where: { user_id: userId } });
      await tx.user_security_settings.updateMany({
        where: { user_id: userId },
        data: {
          totp_enabled: false,
          totp_secret_encrypted: null,
          totp_secret_iv: null,
          totp_secret_tag: null,
        },
      });
    });
  }

  async regenerateBackupCodes(userId: string) {
    const codes = Array.from({ length: 10 }, () => this.generateBackupCodePair());
    const hashedCodes = await Promise.all(
      codes.map((pair) => bcrypt.hash(pair.normalized, this.bcryptRounds)),
    );

    await this.withTransaction(async (tx) => {
      await tx.user_totp_backup_codes.deleteMany({ where: { user_id: userId } });
      await tx.user_totp_backup_codes.createMany({
        data: hashedCodes.map((hash) => ({ user_id: userId, code_hash: hash })),
      });
    });

    return codes.map((pair) => pair.display);
  }

  async isEnabled(userId: string) {
    const settings = await this.prisma.prisma().user_security_settings.findUnique({
      where: { user_id: userId },
      select: { totp_enabled: true },
    });
    return settings?.totp_enabled ?? false;
  }

  async verifyTotp(userId: string, code: string) {
    const settings = await this.prisma.prisma().user_security_settings.findUnique({
      where: { user_id: userId },
      select: {
        totp_secret_encrypted: true,
        totp_secret_iv: true,
        totp_secret_tag: true,
        totp_enabled: true,
      },
    });
    if (!settings?.totp_enabled) return false;
    const secret = this.decryptSecret(
      settings.totp_secret_encrypted,
      settings.totp_secret_iv,
      settings.totp_secret_tag,
    );
    if (!secret) return false;
    return authenticator.check(code, secret);
  }

  async verifyBackupCode(userId: string, code: string) {
    const normalized = this.normalizeBackupCode(code);
    const codes = await this.prisma.prisma().user_totp_backup_codes.findMany({
      where: { user_id: userId },
    });

    for (const entry of codes) {
      if (entry.used_at) continue;
      const match = await bcrypt.compare(normalized, entry.code_hash);
      if (match) {
        await this.prisma.prisma().user_totp_backup_codes.update({
          where: { id: entry.id },
          data: { used_at: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  async getStatus(userId: string) {
    const [settings, codes] = await Promise.all([
      this.prisma.prisma().user_security_settings.findUnique({
        where: { user_id: userId },
        select: { totp_enabled: true },
      }),
      this.prisma.prisma().user_totp_backup_codes.findMany({
        where: { user_id: userId },
        select: { used_at: true },
      }),
    ]);

    const remaining = codes.filter((c) => !c.used_at).length;
    return {
      enabled: settings?.totp_enabled ?? false,
      remaining,
    };
  }

  async createChallenge(userId: string) {
    const token = randomUUID();
    await this.redis.set(`${TFA_CHALLENGE_PREFIX}:${token}`, JSON.stringify({ userId }), 'EX', this.challengeTtl);
    return token;
  }

  async consumeChallenge(token: string) {
    const key = `${TFA_CHALLENGE_PREFIX}:${token}`;
    const payload = await this.redis.get(key);
    if (!payload) return null;
    await this.redis.del(key);
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed?.userId === 'string' ? parsed.userId : null;
    } catch {
      return null;
    }
  }

  private async ensureSettings(userId: string) {
    await this.prisma.prisma().user_security_settings.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });
  }
}
