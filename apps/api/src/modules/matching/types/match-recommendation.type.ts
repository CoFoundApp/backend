import { ObjectType, Field } from '@nestjs/graphql';
import { Profile } from '../../profile/profile.type';

@ObjectType()
export class MatchRecommendation {
  @Field(() => Profile)
  profile!: Profile;

  @Field(() => Number)
  score!: number;

  @Field(() => Number)
  distance!: number;

  @Field(() => [String])
  reasons!: string[];
}
