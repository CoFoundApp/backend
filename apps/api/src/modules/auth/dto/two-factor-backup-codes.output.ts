import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TwoFactorBackupCodesOutput {
  @Field(() => [String])
  codes!: string[];
}
