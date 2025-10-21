import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OAuthUrlOutput {
  @Field()
  url!: string;
}
