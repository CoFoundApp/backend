import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LanguageCode } from '../../../common/enums/domain.enums';

@InputType()
export class MatchFiltersInput {
  @IsOptional()
  @IsArray()
  @IsEnum(LanguageCode, { each: true })
  @Field(() => [LanguageCode], { nullable: true })
  languages?: LanguageCode[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true })
  minAvailabilityHours?: number;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  country?: string;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  remote?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  tagsAny?: string[];

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, description: 'Inclure les profils/projets non listés' })
  includeUnlisted?: boolean;
}
