import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BillingPlanCode } from './billing.types';
import { reset_interval } from '@prisma/client';

interface EntitlementDefinition {
  featureCode: string;
  limit: number | null;
  reset: reset_interval;
}

const PLAN_ENTITLEMENTS: Record<BillingPlanCode, EntitlementDefinition[]> = {
  free: [
    { featureCode: 'matches_per_month', limit: 3, reset: reset_interval.month },
    { featureCode: 'spaces', limit: 1, reset: reset_interval.never },
    { featureCode: 'pdf_exports', limit: 0, reset: reset_interval.never },
    { featureCode: 'dashboards', limit: 0, reset: reset_interval.never },
    { featureCode: 'realtime_co_edit', limit: 0, reset: reset_interval.never },
    { featureCode: 'advanced_scoring', limit: 0, reset: reset_interval.never },
    { featureCode: 'office_hours', limit: 0, reset: reset_interval.never },
  ],
  solo: [
    { featureCode: 'matches_per_month', limit: 15, reset: reset_interval.month },
    { featureCode: 'spaces', limit: 3, reset: reset_interval.never },
    { featureCode: 'pdf_exports', limit: 1, reset: reset_interval.never },
    { featureCode: 'dashboards', limit: 0, reset: reset_interval.never },
    { featureCode: 'realtime_co_edit', limit: 0, reset: reset_interval.never },
    { featureCode: 'advanced_scoring', limit: 0, reset: reset_interval.never },
    { featureCode: 'office_hours', limit: 0, reset: reset_interval.never },
  ],
  pro: [
    { featureCode: 'matches_per_month', limit: null, reset: reset_interval.month },
    { featureCode: 'spaces', limit: 10, reset: reset_interval.never },
    { featureCode: 'pdf_exports', limit: 1, reset: reset_interval.never },
    { featureCode: 'dashboards', limit: 1, reset: reset_interval.never },
    { featureCode: 'realtime_co_edit', limit: 0, reset: reset_interval.never },
    { featureCode: 'advanced_scoring', limit: 1, reset: reset_interval.never },
    { featureCode: 'office_hours', limit: 0, reset: reset_interval.never },
  ],
};

@Injectable()
export class BillingEntitlementsService {
  private readonly logger = new Logger(BillingEntitlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncForSubscription(subscriptionId: string, planCode: BillingPlanCode): Promise<void> {
    const definitions = PLAN_ENTITLEMENTS[planCode];
    if (!definitions) {
      this.logger.warn(`No entitlements defined for plan ${planCode}`);
      return;
    }

    await this.prisma.$transaction(async tx => {
      const existing = await tx.entitlements.findMany({ where: { subscription_id: subscriptionId } });
      const desiredCodes = new Set(definitions.map(d => d.featureCode));

      for (const definition of definitions) {
        await tx.entitlements.upsert({
          where: {
            subscription_id_feature_code: {
              subscription_id: subscriptionId,
              feature_code: definition.featureCode,
            },
          },
          create: {
            subscription_id: subscriptionId,
            feature_code: definition.featureCode,
            limit_value: definition.limit ?? undefined,
            reset_every: definition.reset,
          },
          update: {
            limit_value: definition.limit ?? undefined,
            reset_every: definition.reset,
            ...(definition.limit === null ? {} : { used_value: 0 }),
          },
        });
      }

      for (const entitlement of existing) {
        if (!desiredCodes.has(entitlement.feature_code)) {
          await tx.entitlements.delete({
            where: { id: entitlement.id },
          });
        }
      }
    });
  }
}
