import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, Matches } from 'class-validator';

@InputType()
export class RegenerateTwoFactorCodesInput {
  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^\d{6}$/)
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{6,}$/)
  backupCode?: string;
}
