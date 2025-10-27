import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';

const DEFAULT_VERIFICATION_TTL = 60 * 60 * 24;

@Injectable()
export class EmailVerificationService {
  private readonly ttlSeconds: number;
  private readonly appBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService,
  ) {
    this.ttlSeconds = Number(process.env.EMAIL_VERIFICATION_TTL ?? DEFAULT_VERIFICATION_TTL);
    this.appBaseUrl = process.env.APP_BASE_URL ?? 'https://cofound.example.com';
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  async createToken(userId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const token = this.generateRawToken();
    const hash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    await this.withTransaction(async (tx) => {
      await tx.email_verification_tokens.deleteMany({
        where: {
          user_id: userId,
          email: normalizedEmail,
          consumed_at: null,
        },
      });

      await tx.email_verification_tokens.create({
        data: {
          user_id: userId,
          email: normalizedEmail,
          token_hash: hash,
          expires_at: expiresAt,
        },
      });
    });

    return { token, expiresAt };
  }

  async sendVerificationEmail(userId: string, email: string, locale = 'en', context: { reason: 'signup' | 'change' }) {
    const { token, expiresAt } = await this.createToken(userId, email);

    const verificationUrl = `${this.appBaseUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

    await this.mail.sendTemplate(email, 'verify-email', locale, {
      verification_url: verificationUrl,
      expires_at_iso: expiresAt.toISOString(),
      is_email_change: context.reason === 'change',
      is_signup: context.reason === 'signup',
    });
  }

  async verify(token: string) {
    const hashed = this.hashToken(token);
    const record = await this.prisma.prisma().email_verification_tokens.findFirst({
      where: {
        token_hash: hashed,
        consumed_at: null,
      },
    });

    if (!record || record.expires_at.getTime() < Date.now()) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    return this.withTransaction(async (tx) => {
      const user = await tx.users.findUnique({ where: { id: record.user_id } });
      if (!user) throw new NotFoundException('User not found');

      const targetEmail = record.email.toLowerCase();
      const isPendingChange = user.pending_email?.toLowerCase() === targetEmail;
      const matchesCurrent = user.email.toLowerCase() === targetEmail;

      if (!isPendingChange && !matchesCurrent) {
        throw new NotFoundException('Token does not match any pending email change');
      }

      await tx.email_verification_tokens.update({
        where: { id: record.id },
        data: { consumed_at: new Date() },
      });

      if (isPendingChange) {
        const existing = await tx.users.findUnique({ where: { email: targetEmail } });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Email already in use');
        }
      }

      await tx.users.update({
        where: { id: user.id },
        data: {
          email: isPendingChange ? targetEmail : user.email,
          email_verified_at: new Date(),
          pending_email: isPendingChange ? null : user.pending_email,
        },
      });

      await tx.email_verification_tokens.deleteMany({
        where: {
          user_id: user.id,
          consumed_at: null,
        },
      });

      return { userId: user.id, email: targetEmail, isChange: isPendingChange };
    });
  }

  private async withTransaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>) {
    const prisma = this.prisma.prisma();
    if (prisma instanceof PrismaService) {
      return prisma.$transaction(async (tx) => handler(tx));
    }
    return handler(prisma);
  }
}
