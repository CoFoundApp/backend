import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TokensOutput {
  @Field(() => String, { nullable: true })
  accessToken?: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string;

  @Field(() => Boolean, { defaultValue: false })
  requiresTwoFactor = false;

  @Field(() => String, { nullable: true })
  twoFactorToken?: string;

  @Field(() => Boolean, { defaultValue: false })
  emailVerificationRequired = false;
}
