import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import {
  ProjectStatus,
  ProjectStage,
  ProfileVisibility,
  WorkStyle,
  CoreValue,
  TeamRolePreference,
  TeamSizePreference,
  ManagementStyle,
  EnvironmentPreference,
  CollaborationMode,
  CommunicationStylePreference,
  CommunicationFrequencyPreference,
  UrgencyLevel,
} from '../../common/enums/domain.enums';
import { JSONScalar } from '../../common/scalars/json.scalar';

@ObjectType()
export class Project {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  owner_id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => ProjectStatus)
  status!: ProjectStatus;

  @Field(() => ProjectStage)
  stage!: ProjectStage;

  @Field(() => ProfileVisibility)
  visibility!: ProfileVisibility;

  @Field(() => [String])
  attachment_urls!: string[];

  @Field(() => String, { nullable: true })
  banner_url?: string | null;

  @Field(() => String, { nullable: true })
  avatar_url?: string | null;

  @Field(() => [WorkStyle])
  culture_work_styles!: WorkStyle[];

  @Field(() => [CoreValue])
  culture_values!: CoreValue[];

  @Field(() => TeamRolePreference, { nullable: true })
  preferred_team_role?: TeamRolePreference | null;

  @Field(() => TeamSizePreference, { nullable: true })
  preferred_team_size?: TeamSizePreference | null;

  @Field(() => ManagementStyle, { nullable: true })
  management_style?: ManagementStyle | null;

  @Field(() => EnvironmentPreference, { nullable: true })
  environment?: EnvironmentPreference | null;

  @Field(() => CollaborationMode, { nullable: true })
  collaboration_mode?: CollaborationMode | null;

  @Field(() => CommunicationStylePreference, { nullable: true })
  communication_style?: CommunicationStylePreference | null;

  @Field(() => CommunicationFrequencyPreference, { nullable: true })
  communication_frequency?: CommunicationFrequencyPreference | null;

  @Field(() => String, { nullable: true })
  timezone?: string | null;

  @Field(() => Number, { nullable: true })
  required_hours_min?: number | null;

  @Field(() => Number, { nullable: true })
  required_hours_max?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  critical_time_slots?: any;

  @Field(() => Number, { nullable: true })
  remote_ratio_min?: number | null;

  @Field(() => Number, { nullable: true })
  remote_ratio_max?: number | null;

  @Field(() => Number, { nullable: true })
  duration_weeks_min?: number | null;

  @Field(() => Number, { nullable: true })
  duration_weeks_max?: number | null;

  @Field(() => UrgencyLevel, { nullable: true })
  urgency?: UrgencyLevel | null;

  @Field(() => Number, { nullable: true })
  acceptance_rate?: number | null;

  @Field(() => Number, { nullable: true })
  average_project_rating?: number | null;

  @Field(() => Number, { nullable: true })
  average_response_time_minutes?: number | null;

  @Field(() => [String])
  project_skills!: string[];

  @Field(() => [String])
  project_interests!: string[];

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}
