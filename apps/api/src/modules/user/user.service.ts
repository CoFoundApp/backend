import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../../common/enums/domain.enums';
import { mapRoleToPrisma, mapStatusToPrisma } from '../../common/enums/enum-mapper';
import { TemplateMailerService } from '../../infra/email/template-mailer.service';
import { AppError } from '../../common/errors/app-error.factory';

const BCRYPT_ROUNDS = Number(process.env.SECURITY_BCRYPT_ROUNDS ?? 12);

@Injectable()
export class UserService {
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TemplateMailerService,
  ) {}

  private async safeSend(to: string | null | undefined, template: string, payload: Record<string, any>) {
    if (!to) return;
    try { await this.mail.sendTemplate(to, template, 'en', payload); } catch {}
  }

  /** liste des utilisateurs */
  async listUsers(limit = 50) {
    return this.prisma.prisma().users.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        locale: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /** création utilisateur */
  async createUser(email: string, password: string, role?: UserRole, status?: UserStatus) {
    const normalizedEmail = email.trim().toLowerCase();
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.prisma().users.create({
        data: {
          email: normalizedEmail,
          password_hash,
          role: mapRoleToPrisma(role ?? UserRole.USER),
          status: mapStatusToPrisma(status ?? UserStatus.ACTIVE),
        },
        select: { id: true, email: true, role: true, status: true, locale: true, created_at: true, updated_at: true },
      });

      await this.safeSend(user.email, 'user_account_created', {
        app_name: this.appName,
        email: user.email,
        role: String(user.role),
        status: String(user.status),
        cta_url: `${process.env.APP_BASE_URL}/login`,
      });

      return user;
    } catch (e: any) {
      if (e?.code === 'P2002') throw AppError.conflict('email.already.exists');
      throw e;
    }
  }

  /** mise à jour utilisateur */
  async updateUserAdmin(id: string, role?: UserRole, status?: UserStatus) {
    const user = await this.prisma.prisma().users.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('user.not.found');

    const updated = await this.prisma.prisma().users.update({
      where: { id },
      data: {
        role: role ? mapRoleToPrisma(role) : undefined,
        status: status ? mapStatusToPrisma(status) : undefined,
      },
      select: { id: true, email: true, role: true, status: true, locale: true, created_at: true, updated_at: true },
    });

    if (role || status) {
      await this.safeSend(updated.email, 'user_account_updated', {
        app_name: this.appName,
        email: updated.email,
        role: String(updated.role),
        status: String(updated.status),
        cta_url: `${process.env.APP_BASE_URL}/account`,
      });
    }

    return updated;
  }

  /** lecture d'un utilisateur par ID */
  async findById(id: string) {
    return this.prisma.prisma().users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        locale: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /** Optionnel: set last_login_at */
  async setLastLogin(userId: string) {
    await this.prisma.prisma().users.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });
  }

  /** mise à jour de mon utilisateur */
  async updateUser(
    id: string,
    input: { email?: string; password?: string; currentPassword?: string; status?: UserStatus },
  ) {
    const user = await this.prisma.prisma().users.findUnique({
      where: { id },
      select: { id: true, email: true, password_hash: true },
    });
    if (!user) throw AppError.notFound('user.not.found');

    let password_hash: string | undefined;
    if (input.password) {
      if (!input.currentPassword) {
        throw AppError.conflict('current.password.is.required.to.change.password');
      }
      const ok = await bcrypt.compare(input.currentPassword, user.password_hash ?? '');
      if (!ok) {
        throw AppError.conflict('current.password.is.invalid');
      }
      password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    }

    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : undefined;

    try {
      const updated = await this.prisma.prisma().users.update({
        where: { id },
        data: {
          email: normalizedEmail ?? undefined,
          password_hash: password_hash ?? undefined,
          status: input.status ? mapStatusToPrisma(input.status) : undefined,
        },
        select: { id: true, email: true, role: true, status: true, locale: true, created_at: true, updated_at: true },
      });

      await this.safeSend(updated.email, 'user_account_updated', {
        app_name: this.appName,
        email: updated.email,
        role: String(updated.role),
        status: String(updated.status),
        cta_url: `${process.env.APP_BASE_URL}/account`,
      });

      return updated;
    } catch (e: any) {
      if (e?.code === 'P2002') throw AppError.conflict('email.already.exists');
      throw e;
    }
  }
}
