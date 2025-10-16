import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsUrl } from 'class-validator';

@InputType()
export class CustomerPortalSessionInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
