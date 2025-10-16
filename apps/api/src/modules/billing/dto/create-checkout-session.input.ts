import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { BillingIntervalEnum, BillingPlanCodeEnum, BillingInterval, BillingPlanCode } from '../billing.types';

@InputType()
export class CreateCheckoutSessionInput {
  @Field(() => BillingPlanCodeEnum)
  @IsEnum(BillingPlanCodeEnum)
  planCode!: BillingPlanCode;

  @Field(() => BillingIntervalEnum)
  @IsEnum(BillingIntervalEnum)
  interval!: BillingInterval;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  successUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  promotionCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
