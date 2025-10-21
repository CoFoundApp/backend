import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TwoFactorSetupOutput {
  @Field()
  secret!: string;

  @Field()
  otpAuthUrl!: string;
}
