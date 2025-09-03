import { InputType, Field } from '@nestjs/graphql';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { LanguageCode, ProfileVisibility } from '../../../common/enums/domain.enums';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';

@InputType()
export class UpdateMyProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  display_name?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  headline?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bio?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  location?: string | null;

  @Field(() => [String], { nullable: true, description: 'LanguageCode enum values' })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(LanguageCode), { each: true })
  languages?: LanguageCode[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  website_url?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  avatar_url?: string | null;

  @Field(() => GraphQLUpload, { nullable: true })
  @IsOptional()
  avatar?: FileUpload;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  banner_url?: string | null;

  @Field(() => GraphQLUpload, { nullable: true })
  @IsOptional()
  banner?: FileUpload;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  looking_for?: string | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  availability_hours?: number | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => ProfileVisibility, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(ProfileVisibility))
  visibility?: ProfileVisibility;
}
