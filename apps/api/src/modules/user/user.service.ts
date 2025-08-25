import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../../common/enums/domain.enums';
import { mapRoleToPrisma, mapStatusToPrisma } from '../../common/enums/enum-mapper';

const BCRYPT_ROUNDS = Number(process.env.SECURITY_BCRYPT_ROUNDS ?? 12);

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
      return await this.prisma.prisma().users.create({
        data: {
          email: normalizedEmail,
          password_hash,
          role: mapRoleToPrisma(role ?? UserRole.USER),
          status: mapStatusToPrisma(status ?? UserStatus.ACTIVE),
        },
        select: { id: true, email: true, role: true, status: true, created_at: true, updated_at: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Email already exists');
      throw e;
    }
  }

  /** mise à jour utilisateur */
  async updateUser(id: string, role?: UserRole, status?: UserStatus) {
    const user = await this.prisma.prisma().users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.prisma().users.update({
      where: { id },
      data: {
        role: role ? mapRoleToPrisma(role) : undefined,
        status: status ? mapStatusToPrisma(status) : undefined,
      },
      select: { id: true, email: true, role: true, status: true, created_at: true, updated_at: true },
    });
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
}
