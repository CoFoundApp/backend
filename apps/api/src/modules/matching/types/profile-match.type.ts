import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Profile } from '../../profile/profile.type';

@ObjectType()
export class ProfileMatch {
  @Field(() => Profile)
  profile!: Profile;

  @Field(() => Float)
  distance!: number;

  @Field(() => Float)
  score!: number;

  @Field(() => [String])
  reasons!: string[];
}
