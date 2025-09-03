import { InputType, Field, Int } from '@nestjs/graphql';
import { LanguageCode } from '../../../common/enums/domain.enums';

@InputType()
export class MatchFiltersInput {
  @Field(() => [LanguageCode], { nullable: true })
  languages?: LanguageCode[];

  @Field(() => Int, { nullable: true })
  minAvailabilityHours?: number;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Boolean, { nullable: true })
  remote?: boolean;

  @Field(() => [String], { nullable: true })
  tagsAny?: string[];
}
