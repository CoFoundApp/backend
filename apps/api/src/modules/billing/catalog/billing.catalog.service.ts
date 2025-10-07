import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingPlanCode, BillingPlanDefinition, BillingPlanVariant, BillingInterval } from '../billing.types';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { plan_interval } from '@prisma/client';

interface PriceKeyMap {
  month: string;
  year?: string;
}

const PRICE_ENV_MAP: Record<BillingPlanCode, PriceKeyMap> = {
  free: { month: 'STRIPE_PRICE_FREE_MONTHLY' },
  solo: { month: 'STRIPE_PRICE_SOLO_MONTHLY', year: 'STRIPE_PRICE_SOLO_ANNUAL' },
  pro: { month: 'STRIPE_PRICE_PRO_MONTHLY', year: 'STRIPE_PRICE_PRO_ANNUAL' },
};

const PLAN_DEFINITIONS: BillingPlanDefinition[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Essentials to explore CoFound with limited matches and one workspace.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    features: {
      matchesPerMonth: 3,
      spaces: 1,
      pdfExports: false,
      dashboards: false,
      realtimeCoEdit: false,
      advancedScoring: false,
      officeHours: false,
    },
  },
  {
    code: 'solo',
    name: 'Solo',
    description: 'Grow your network with more matches, extra spaces and PDF exports.',
    monthlyPriceCents: 900,
    annualPriceCents: 9000,
    trialDays: 7,
    features: {
      matchesPerMonth: 15,
      spaces: 3,
      pdfExports: true,
      dashboards: false,
      realtimeCoEdit: false,
      advancedScoring: false,
      officeHours: false,
    },
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Unlimited matches, dashboards and team-ready space limits.',
    monthlyPriceCents: 1900,
    annualPriceCents: 19000,
    trialDays: 14,
    features: {
      matchesPerMonth: null,
      spaces: 10,
      pdfExports: true,
      dashboards: true,
      realtimeCoEdit: false,
      advancedScoring: true,
      officeHours: false,
    },
  },
];

@Injectable()
export class BillingCatalogService implements OnModuleInit {
  private readonly logger = new Logger(BillingCatalogService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncPlanCatalog();
  }

  getCatalog(): BillingPlanDefinition[] {
    return PLAN_DEFINITIONS;
  }

  getVariant(planCode: BillingPlanCode, interval: BillingInterval): BillingPlanVariant {
    const plan = PLAN_DEFINITIONS.find(p => p.code === planCode);
    if (!plan) throw new Error(`Unknown plan ${planCode}`);
    const intervalKey: BillingInterval = interval;
    const price = intervalKey === 'month' ? plan.monthlyPriceCents : plan.annualPriceCents;
    const envKey = this.resolvePriceEnvKey(planCode, intervalKey);
    const stripePriceId = this.config.get<string>(envKey) ?? '';
    if (!stripePriceId && price > 0) {
      this.logger.warn(`Stripe price id missing for ${planCode} ${intervalKey} (${envKey})`);
    }

    return {
      plan,
      interval: intervalKey,
      priceCents: price,
      stripePriceId,
      trialDays: plan.trialDays,
      planCodeForDatabase: `${plan.code}-${intervalKey}`,
    };
  }

  getPublicCatalog(): Array<{
    code: BillingPlanCode;
    name: string;
    description: string;
    highlight?: string;
    monthly: { priceCents: number; priceEuros: number; stripePriceId: string; trialDays?: number };
    annual: { priceCents: number; priceEuros: number; stripePriceId: string; trialDays?: number };
    features: BillingPlanDefinition['features'];
  }> {
    return PLAN_DEFINITIONS.map(plan => ({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      highlight: plan.highlight,
      monthly: this.toPublicVariant(this.getVariant(plan.code, 'month')),
      annual: this.toPublicVariant(this.getVariant(plan.code, 'year')),
      features: plan.features,
    }));
  }

  findByStripePriceId(priceId: string): BillingPlanVariant | undefined {
    if (!priceId) return undefined;
    for (const plan of PLAN_DEFINITIONS) {
      for (const interval of ['month', 'year'] as BillingInterval[]) {
        const variant = this.getVariant(plan.code, interval);
        if (variant.stripePriceId === priceId) {
          return variant;
        }
      }
    }
    return undefined;
  }

  private toPublicVariant(variant: BillingPlanVariant) {
    return {
      priceCents: variant.priceCents,
      priceEuros: Math.round(variant.priceCents) / 100,
      stripePriceId: variant.stripePriceId,
      trialDays: variant.trialDays,
    };
  }

  private resolvePriceEnvKey(planCode: BillingPlanCode, interval: BillingInterval): string {
    const mapping = PRICE_ENV_MAP[planCode];
    if (!mapping) throw new Error(`No price map for ${planCode}`);
    if (interval === 'year') {
      return mapping.year ?? mapping.month;
    }
    return mapping.month;
  }

  private async syncPlanCatalog(): Promise<void> {
    for (const plan of PLAN_DEFINITIONS) {
      for (const interval of ['month', 'year'] as BillingInterval[]) {
        const variant = this.getVariant(plan.code, interval);
        if (variant.priceCents === 0 && interval === 'year') {
          // Skip creating annual free plans to avoid duplicates.
          continue;
        }
        await this.prisma.plans.upsert({
          where: { code: variant.planCodeForDatabase },
          update: {
            name: `${plan.name} (${interval === 'month' ? 'Mensuel' : 'Annuel'})`,
            price_cents: variant.priceCents,
            interval: interval === 'month' ? plan_interval.month : plan_interval.year,
            features: plan.features as any,
            active: true,
          },
          create: {
            code: variant.planCodeForDatabase,
            name: `${plan.name} (${interval === 'month' ? 'Mensuel' : 'Annuel'})`,
            price_cents: variant.priceCents,
            interval: interval === 'month' ? plan_interval.month : plan_interval.year,
            features: plan.features as any,
          },
        });
      }
    }
  }
}
