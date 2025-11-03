import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import {
  ProfileVisibility,
  LanguageCode,
  WorkStyle,
  CoreValue,
  Motivation,
  EnvironmentPreference,
  TeamRolePreference,
  CommunicationStylePreference,
  CommunicationFrequencyPreference,
  TeamSizePreference,
  CollaborationMode,
} from '../../common/enums/domain.enums';
import { Skill } from '../taxonomy/types/skill.type';
import { Interest } from '../taxonomy/types/interest.type';
import { JSONScalar } from '../../common/scalars/json.scalar';

@ObjectType()
export class WorkExperience {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  company!: string;

  @Field(() => GraphQLISODateTime)
  start_date!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  end_date?: Date | null;

  @Field(() => Boolean)
  is_current!: boolean;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}

@ObjectType()
export class Education {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  school!: string;

  @Field(() => String, { nullable: true })
  degree?: string | null;

  @Field(() => String, { nullable: true })
  field_of_study?: string | null;

  @Field(() => GraphQLISODateTime)
  start_date!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  end_date?: Date | null;

  @Field(() => Boolean)
  is_current!: boolean;

  @Field(() => String, { nullable: true })
  grade?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}

@ObjectType()
export class VolunteerExperience {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  organization!: string;

  @Field(() => GraphQLISODateTime)
  start_date!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  end_date?: Date | null;

  @Field(() => Boolean)
  is_current!: boolean;

  @Field(() => String, { nullable: true })
  cause?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;
}

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

  @Field(() => [WorkStyle])
  preferred_work_styles!: WorkStyle[];

  @Field(() => [CoreValue])
  core_values!: CoreValue[];

  @Field(() => [Motivation])
  primary_motivations!: Motivation[];

  @Field(() => [EnvironmentPreference])
  preferred_environments!: EnvironmentPreference[];

  @Field(() => TeamSizePreference, { nullable: true })
  preferred_team_size?: TeamSizePreference | null;

  @Field(() => TeamRolePreference, { nullable: true })
  desired_team_role?: TeamRolePreference | null;

  @Field(() => CommunicationStylePreference, { nullable: true })
  communication_style?: CommunicationStylePreference | null;

  @Field(() => CommunicationFrequencyPreference, { nullable: true })
  communication_frequency?: CommunicationFrequencyPreference | null;

  @Field(() => CollaborationMode, { nullable: true })
  preferred_collaboration_mode?: CollaborationMode | null;

  @Field(() => String, { nullable: true })
  timezone?: string | null;

  @Field(() => Number, { nullable: true })
  timezone_flexibility_minutes?: number | null;

  @Field(() => Number, { nullable: true })
  remote_preference_percent?: number | null;

  @Field(() => JSONScalar, { nullable: true })
  availability_time_slots?: any;

  @Field(() => Number, { nullable: true })
  mission_duration_min_weeks?: number | null;

  @Field(() => Number, { nullable: true })
  mission_duration_max_weeks?: number | null;

  @Field(() => Number, { nullable: true })
  success_rate?: number | null;

  @Field(() => Number, { nullable: true })
  average_rating?: number | null;

  @Field(() => Number, { nullable: true })
  average_response_time_minutes?: number | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  last_active_at?: Date | null;

  @Field(() => Number, { nullable: true })
  activity_score?: number | null;

  @Field(() => GraphQLISODateTime)
  created_at!: Date;

  @Field(() => GraphQLISODateTime)
  updated_at!: Date;

  @Field(() => [Skill], { description: 'Skills associés au profil' })
  skills!: Skill[];

  @Field(() => [Interest], { description: 'Intérêts associés au profil' })
  interests!: Interest[];

  @Field(() => [WorkExperience], { description: 'Expériences professionnelles associées au profil' })
  workExperiences!: WorkExperience[];

  @Field(() => [Education], { description: 'Formations associées au profil' })
  educations!: Education[];

  @Field(() => [VolunteerExperience], { description: 'Expériences de bénévolat associées au profil' })
  volunteerExperiences!: VolunteerExperience[];
}

@ObjectType()
export class ProfileSearchResult {
  @Field(() => [Profile])
  items!: Profile[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;
}
