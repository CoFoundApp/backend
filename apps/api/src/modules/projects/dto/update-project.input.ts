import { InputType, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CollaborationMode,
  CommunicationFrequencyPreference,
  CommunicationStylePreference,
  CoreValue,
  EnvironmentPreference,
  ManagementStyle,
  ProfileVisibility,
  ProjectStage,
  ProjectStatus,
  TeamRolePreference,
  TeamSizePreference,
  UrgencyLevel,
  WorkStyle,
} from '../../../common/enums/domain.enums';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { JSONScalar } from '../../../common/scalars/json.scalar';

@InputType()
export class UpdateProjectInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  summary?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  industry?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @Field(() => ProjectStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus | null;

  @Field(() => ProjectStage, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage | null;

  @Field(() => [String])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  project_skills?: string[] | null;

  @Field(() => [String])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  project_interests?: string[] | null;

  @Field(() => ProfileVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibility?: ProfileVisibility | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachment_urls?: string[] | null;

  @Field(() => [GraphQLUpload], { nullable: true })
  @IsOptional()
  @IsArray()
  attachments?: FileUpload[] | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  banner_url?: string | null;

  @Field(() => GraphQLUpload, { nullable: true })
  @IsOptional()
  banner?: FileUpload | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  avatar_url?: string | null;

  @Field(() => GraphQLUpload, { nullable: true })
  @IsOptional()
  avatar?: FileUpload | null;

  @Field(() => [WorkStyle], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkStyle, { each: true })
  culture_work_styles?: WorkStyle[] | null;

  @Field(() => [CoreValue], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CoreValue, { each: true })
  culture_values?: CoreValue[] | null;

  @Field(() => TeamRolePreference, { nullable: true })
  @IsOptional()
  @IsEnum(TeamRolePreference)
  preferred_team_role?: TeamRolePreference | null;

  @Field(() => TeamSizePreference, { nullable: true })
  @IsOptional()
  @IsEnum(TeamSizePreference)
  preferred_team_size?: TeamSizePreference | null;

  @Field(() => ManagementStyle, { nullable: true })
  @IsOptional()
  @IsEnum(ManagementStyle)
  management_style?: ManagementStyle | null;

  @Field(() => EnvironmentPreference, { nullable: true })
  @IsOptional()
  @IsEnum(EnvironmentPreference)
  environment?: EnvironmentPreference | null;

  @Field(() => CollaborationMode, { nullable: true })
  @IsOptional()
  @IsEnum(CollaborationMode)
  collaboration_mode?: CollaborationMode | null;

  @Field(() => CommunicationStylePreference, { nullable: true })
  @IsOptional()
  @IsEnum(CommunicationStylePreference)
  communication_style?: CommunicationStylePreference | null;

  @Field(() => CommunicationFrequencyPreference, { nullable: true })
  @IsOptional()
  @IsEnum(CommunicationFrequencyPreference)
  communication_frequency?: CommunicationFrequencyPreference | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  timezone?: string | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  required_hours_min?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  required_hours_max?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  critical_time_slots?: unknown;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  remote_ratio_min?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  remote_ratio_max?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_weeks_min?: number | null;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_weeks_max?: number | null;

  @Field(() => UrgencyLevel, { nullable: true })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel | null;
}
