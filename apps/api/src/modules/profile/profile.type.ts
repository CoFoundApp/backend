import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ProfileVisibility, LanguageCode } from '../../common/enums/domain.enums';

@ObjectType()
export class Profile {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  user_id!: string;

  @Field(() => String, { nullable: true })
  display_name?: string | null;

  @Field(() => String, { nullable: true })
  headline?: string | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => [LanguageCode])
  languages!: LanguageCode[];

  @Field(() => String, { nullable: true })
  website_url?: string | null;

  @Field(() => String, { nullable: true })
  avatar_url?: string | null;

  @Field(() => String, { nullable: true })
  banner_url?: string | null;

  @Field(() => String, { nullable: true })
  looking_for?: string | null;

  @Field(() => Number, { nullable: true })
  availability_hours?: number | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => ProfileVisibility)
  visibility!: ProfileVisibility;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}
