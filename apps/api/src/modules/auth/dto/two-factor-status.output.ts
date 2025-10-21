import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TwoFactorStatusOutput {
  @Field()
  enabled!: boolean;

  @Field()
  backupCodesRemaining!: number;
}
