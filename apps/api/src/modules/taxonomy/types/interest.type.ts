import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Interest {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  slug?: string | null;
}
