import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TokensOutput {
  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;
}
