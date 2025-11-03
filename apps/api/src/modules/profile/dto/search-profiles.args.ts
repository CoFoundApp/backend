import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { LanguageCode } from '../../../common/enums/domain.enums';
import { Type } from 'class-transformer';

@InputType()
export class ProfileSearchFilterInput {
  @Field(() => [LanguageCode], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(LanguageCode, { each: true })
  languages?: LanguageCode[] | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  minAvailabilityHours?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  remote?: boolean | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsAny?: string[] | null;

  @Field(() => [String], {
    nullable: true,
    description: "Liste de compétences (slug ou nom) – OR logique",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsAny?: string[] | null;

  @Field(() => Boolean, { nullable: true, description: 'Inclure les profils non listés' })
  @IsOptional()
  @IsBoolean()
  includeUnlisted?: boolean | null;
}

@ArgsType()
export class SearchProfilesArgs {
  @Field(() => String, { nullable: true, description: 'Requête en langage naturel' })
  @IsOptional()
  @IsString()
  q?: string | null;

  @Field(() => ProfileSearchFilterInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileSearchFilterInput)
  filter?: ProfileSearchFilterInput | null;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number | null;

  @Field(() => String, { nullable: true, description: 'Cursor encodé en base64' })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
