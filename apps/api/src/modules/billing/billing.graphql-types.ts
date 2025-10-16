import { Field, Float, GraphQLISODateTime, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BillingInterval, BillingPlanCode, BillingIntervalEnum, BillingPlanCodeEnum } from './billing.types';

export enum BillingCheckoutMode {
  STRIPE_CHECKOUT = 'stripe_checkout',
  IMMEDIATE = 'immediate',
}

registerEnumType(BillingCheckoutMode, {
  name: 'BillingCheckoutMode',
  description: 'Mode de finalisation de la souscription (checkout Stripe ou activation immédiate).',
});

@ObjectType()
export class BillingPlanFeatureSetType {
  @Field(() => Int, { nullable: true })
  matchesPerMonth?: number | null;

  @Field(() => Int, { nullable: true })
  spaces?: number | null;

  @Field(() => Boolean)
  pdfExports!: boolean;

  @Field(() => Boolean)
  dashboards!: boolean;

  @Field(() => Boolean)
  realtimeCoEdit!: boolean;

  @Field(() => Boolean)
  advancedScoring!: boolean;

  @Field(() => Boolean)
  officeHours!: boolean;
}

@ObjectType()
export class BillingPlanPriceType {
  @Field(() => Int)
  priceCents!: number;

  @Field(() => Float)
  priceEuros!: number;

  @Field(() => String)
  stripePriceId!: string;

  @Field(() => Int, { nullable: true })
  trialDays?: number | null;
}

@ObjectType()
export class BillingPlanPublicType {
  @Field(() => BillingPlanCodeEnum)
  code!: BillingPlanCode;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  highlight?: string | null;

  @Field(() => BillingPlanPriceType)
  monthly!: BillingPlanPriceType;

  @Field(() => BillingPlanPriceType)
  annual!: BillingPlanPriceType;

  @Field(() => BillingPlanFeatureSetType)
  features!: BillingPlanFeatureSetType;
}

@ObjectType()
export class BillingCheckoutSessionType {
  @Field(() => BillingCheckoutMode)
  mode!: BillingCheckoutMode;

  @Field(() => String, { nullable: true })
  sessionId?: string | null;

  @Field(() => String, { nullable: true })
  url?: string | null;

  @Field(() => String, { nullable: true })
  subscriptionId?: string | null;
}

@ObjectType()
export class BillingPortalSessionType {
  @Field(() => String)
  url!: string;
}

@ObjectType()
export class BillingSubscriptionSummaryType {
  @Field(() => String)
  id!: string;

  @Field(() => BillingPlanCodeEnum)
  planCode!: BillingPlanCode;

  @Field(() => BillingIntervalEnum)
  interval!: BillingInterval;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  stripeSubscriptionId?: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  currentPeriodEnd?: Date | null;
}

@ObjectType()
export class BillingPaymentSummaryType {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  amountCents!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  paymentMethodType?: string | null;

  @Field(() => String, { nullable: true })
  receiptUrl?: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  processedAt?: Date | null;
}

@ObjectType()
export class BillingInvoiceSummaryType {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  amountCents!: number;

  @Field(() => Int, { nullable: true })
  subtotalCents?: number | null;

  @Field(() => Int, { nullable: true })
  taxAmountCents?: number | null;

  @Field(() => Int, { nullable: true })
  totalCents?: number | null;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  status!: string;

  @Field(() => GraphQLISODateTime)
  issuedAt!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  dueAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  paidAt?: Date | null;

  @Field(() => String, { nullable: true })
  number?: string | null;

  @Field(() => String, { nullable: true })
  pdfUrl?: string | null;

  @Field(() => String, { nullable: true })
  stripeInvoiceId?: string | null;

  @Field(() => [BillingPaymentSummaryType])
  payments!: BillingPaymentSummaryType[];
}

@ObjectType()
export class BillingHistoryType {
  @Field(() => [BillingInvoiceSummaryType])
  invoices!: BillingInvoiceSummaryType[];

  @Field(() => [BillingPaymentSummaryType])
  payments!: BillingPaymentSummaryType[];
}
