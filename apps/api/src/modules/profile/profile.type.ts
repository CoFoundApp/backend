import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { ProfileVisibility, LanguageCode } from '../../common/enums/domain.enums';
import { Skill } from '../taxonomy/types/skill.type';
import { Interest } from '../taxonomy/types/interest.type';

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
