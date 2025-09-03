import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

function safeParseJson(s?: string | null): Record<string, any> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null ? v : {};
  } catch {
    return {};
  }
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée un nouvel enregistrement de consentement (historisation).
   */
  async setConsent(opts: {
    userId: string;
    consent_type: string;
    granted: boolean;
    ip?: string | null;
    userAgent?: string | null;
    metadataJson?: string | null;
  }) {
    const metadata = safeParseJson(opts.metadataJson);
    const rec = await this.prisma.prisma().privacy_consents.create({
      data: {
        user_id: opts.userId,
        consent_type: opts.consent_type,
        granted: opts.granted,
        ip_address: opts.ip ?? null,
        user_agent: opts.userAgent ?? null,
        metadata,
      },
    });
    // stringifier metadata pour l’API
    return {
      ...rec,
      metadata: JSON.stringify(rec.metadata ?? {}),
    };
  }

  /**
   * État courant: dernier enregistrement par consent_type (DISTINCT ON).
   */
  async getCurrentConsents(userId: string) {
    const rows: Array<{ consent_type: string; granted: boolean; granted_at: Date }> =
    await this.prisma.prisma().privacy_consents.findMany({
      where: { user_id: userId },
      orderBy: [{ consent_type: 'asc' }, { granted_at: 'desc' }],
      distinct: ['consent_type'],
    });

    return rows;
  }

  /**
   * Historique complet (optionnellement filtré par type).
   */
  async getHistory(userId: string, consent_type?: string | null, limit = 50) {
    const where: any = { user_id: userId };
    if (consent_type) where.consent_type = consent_type;
    const rows = await this.prisma.prisma().privacy_consents.findMany({
      where,
      orderBy: [{ consent_type: 'asc' }, { granted_at: 'desc' }],
      take: limit,
    });
    return rows.map((r) => ({ ...r, metadata: JSON.stringify(r.metadata ?? {}) }));
  }
}
