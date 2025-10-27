import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, Matches } from 'class-validator';

@InputType()
export class ActivateTwoFactorInput {
  @Field()
  @IsNotEmpty()
  secret!: string;

  @Field()
  @Matches(/^\d{6}$/)
  code!: string;
}
