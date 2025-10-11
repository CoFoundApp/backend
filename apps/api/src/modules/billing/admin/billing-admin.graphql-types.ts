import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';
import { BillingIntervalEnum, BillingPlanCodeEnum, BillingInterval, BillingPlanCode } from '../billing.types';

@ObjectType()
export class BillingAdminPlanType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType()
export class BillingAdminInvoiceType {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  amount_cents!: number;

  @Field(() => String)
  status!: string;

  @Field(() => GraphQLISODateTime)
  issued_at!: Date;

  @Field(() => String, { nullable: true })
  number?: string | null;

  @Field(() => String, { nullable: true })
  pdf_url?: string | null;

  @Field(() => String, { nullable: true })
  stripe_invoice_id?: string | null;
}

@ObjectType()
export class BillingAdminPaymentType {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  amount_cents!: number;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  payment_method_type?: string | null;

  @Field(() => String, { nullable: true })
  receipt_url?: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  processed_at?: Date | null;
}

@ObjectType()
export class BillingAdminSubscriptionType {
  @Field(() => String)
  id!: string;

  @Field(() => BillingPlanCodeEnum)
  plan_code!: BillingPlanCode;

  @Field(() => BillingIntervalEnum)
  billing_interval!: BillingInterval;

  @Field(() => String)
  status!: string;

  @Field(() => GraphQLISODateTime)
  started_at!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  current_period_end?: Date | null;

  @Field(() => String, { nullable: true })
  external_subscription_id?: string | null;

  @Field(() => BillingAdminPlanType, { nullable: true })
  plans?: BillingAdminPlanType | null;

  @Field(() => [BillingAdminInvoiceType])
  invoices!: BillingAdminInvoiceType[];
}

@ObjectType()
export class BillingAdminOrganizationType {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;
}

@ObjectType()
export class BillingAdminUserProfileType {
  @Field(() => String, { nullable: true })
  display_name?: string | null;
}

@ObjectType()
export class BillingAdminUserSummaryType {
  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => BillingAdminUserProfileType, { nullable: true })
  profiles?: BillingAdminUserProfileType | null;
}

@ObjectType()
export class BillingAdminCustomerType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  stripe_customer_id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  locale?: string | null;

  @Field(() => String, { nullable: true })
  vat_number?: string | null;

  @Field(() => Boolean)
  vat_valid!: boolean;

  @Field(() => BillingAdminOrganizationType, { nullable: true })
  organization?: BillingAdminOrganizationType | null;

  @Field(() => BillingAdminUserSummaryType, { nullable: true })
  user?: BillingAdminUserSummaryType | null;

  @Field(() => [BillingAdminSubscriptionType])
  subscriptions!: BillingAdminSubscriptionType[];

  @Field(() => [BillingAdminInvoiceType])
  invoices!: BillingAdminInvoiceType[];

  @Field(() => [BillingAdminPaymentType])
  payments!: BillingAdminPaymentType[];

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}

@ObjectType()
export class BillingAdminInvoiceSequenceResultType {
  @Field(() => Int)
  year!: number;

  @Field(() => Int)
  count!: number;
}
