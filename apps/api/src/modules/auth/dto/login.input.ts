import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, Matches, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true, description: '6 digit TOTP code' })
  @IsOptional()
  @Matches(/^\d{6}$/)
  twoFactorCode?: string;

  @Field({ nullable: true, description: 'Backup code in plain text' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{6,}$/)
  twoFactorBackupCode?: string;
}
