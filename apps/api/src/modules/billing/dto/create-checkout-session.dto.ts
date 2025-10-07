import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { BillingInterval, BillingPlanCode } from '../billing.types';

export class CreateCheckoutSessionDto {
  @IsEnum(['free', 'solo', 'pro', 'founder_plus'])
  planCode!: BillingPlanCode;

  @IsEnum(['month', 'year'])
  interval!: BillingInterval;

  @IsOptional()
  @IsUrl({ require_tld: false })
  successUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
