import { registerEnumType } from '@nestjs/graphql';
import { StripeEvent } from './stripe/stripe.types';

export enum BillingPlanCodeEnum {
  FREE = 'free',
  SOLO = 'solo',
  PRO = 'pro',
}

export type BillingPlanCode = `${BillingPlanCodeEnum}`;

export enum BillingIntervalEnum {
  MONTH = 'month',
  YEAR = 'year',
}

export type BillingInterval = `${BillingIntervalEnum}`;

registerEnumType(BillingPlanCodeEnum, {
  name: 'BillingPlanCode',
  description: 'Code du plan d’abonnement Stripe',
});

registerEnumType(BillingIntervalEnum, {
  name: 'BillingInterval',
  description: 'Intervalle de facturation (mensuel ou annuel)',
});

export interface BillingPlanFeatureSet {
  matchesPerMonth: number | null;
  spaces: number | null;
  pdfExports: boolean;
  dashboards: boolean;
  realtimeCoEdit: boolean;
  advancedScoring: boolean;
  officeHours: boolean;
}

export interface BillingPlanDefinition {
  code: BillingPlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  trialDays?: number;
  features: BillingPlanFeatureSet;
  highlight?: string;
}

export interface BillingPlanVariant {
  plan: BillingPlanDefinition;
  interval: BillingInterval;
  priceCents: number;
  stripePriceId: string;
  planCodeForDatabase: string;
  trialDays?: number;
}

export interface StripeEventEnvelope {
  stripeId: string;
  type: string;
  payload: StripeEvent;
}
