import { InputType, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CommunicationFrequencyPreference,
  CommunicationStylePreference,
  CollaborationMode,
  CoreValue,
  EnvironmentPreference,
  LanguageCode,
  Motivation,
  ProfileVisibility,
  TeamRolePreference,
  TeamSizePreference,
  WorkStyle,
} from '../../../common/enums/domain.enums';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { WorkExperienceInput } from './work-experience.input';
import { EducationInput } from './education.input';
import { VolunteerExperienceInput } from './volunteer-experience.input';
import { JSONScalar } from '../../../common/scalars/json.scalar';

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

  @Field(() => [WorkStyle], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkStyle, { each: true })
  preferred_work_styles?: WorkStyle[] | null;

  @Field(() => [CoreValue], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CoreValue, { each: true })
  core_values?: CoreValue[] | null;

  @Field(() => [Motivation], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Motivation, { each: true })
  primary_motivations?: Motivation[] | null;

  @Field(() => [EnvironmentPreference], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EnvironmentPreference, { each: true })
  preferred_environments?: EnvironmentPreference[] | null;

  @Field(() => TeamSizePreference, { nullable: true })
  @IsOptional()
  @IsEnum(TeamSizePreference)
  preferred_team_size?: TeamSizePreference | null;

  @Field(() => TeamRolePreference, { nullable: true })
  @IsOptional()
  @IsEnum(TeamRolePreference)
  desired_team_role?: TeamRolePreference | null;

  @Field(() => CommunicationStylePreference, { nullable: true })
  @IsOptional()
  @IsEnum(CommunicationStylePreference)
  communication_style?: CommunicationStylePreference | null;

  @Field(() => CommunicationFrequencyPreference, { nullable: true })
  @IsOptional()
  @IsEnum(CommunicationFrequencyPreference)
  communication_frequency?: CommunicationFrequencyPreference | null;

  @Field(() => CollaborationMode, { nullable: true })
  @IsOptional()
  @IsEnum(CollaborationMode)
  preferred_collaboration_mode?: CollaborationMode | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  timezone?: string | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  timezone_flexibility_minutes?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  remote_preference_percent?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  availability_time_slots?: unknown;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  mission_duration_min_weeks?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  mission_duration_max_weeks?: number | null;

  @Field(() => ProfileVisibility, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(ProfileVisibility))
  visibility?: ProfileVisibility;

  @Field(() => [String], { nullable: true, description: 'Skills slugs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @Field(() => [String], { nullable: true, description: 'Interests slugs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @Field(() => [WorkExperienceInput], { nullable: true, description: 'Expériences professionnelles' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceInput)
  work_experiences?: WorkExperienceInput[];

  @Field(() => [EducationInput], { nullable: true, description: 'Formations' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationInput)
  educations?: EducationInput[];

  @Field(() => [VolunteerExperienceInput], { nullable: true, description: 'Expériences bénévolat' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolunteerExperienceInput)
  volunteer_experiences?: VolunteerExperienceInput[];
}
