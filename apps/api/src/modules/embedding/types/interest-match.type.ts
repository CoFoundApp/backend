import { ObjectType, Field } from '@nestjs/graphql';
import { Interest } from '../../taxonomy/types/interest.type';

@ObjectType()
export class InterestMatch {
  @Field(() => Interest)
  item!: Interest;

  @Field(() => Number, { description: 'Cosine distance (plus petit = plus proche)' })
  distance!: number;
}
