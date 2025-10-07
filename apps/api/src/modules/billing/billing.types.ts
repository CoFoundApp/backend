import { StripeEvent } from './stripe/stripe.types';

export type BillingInterval = 'month' | 'year';

export type BillingPlanCode = 'free' | 'solo' | 'pro';

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
