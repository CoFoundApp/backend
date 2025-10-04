import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class VolunteerExperienceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String)
  @IsString()
  organization!: string;

  @Field(() => String)
  @IsDateString()
  start_date!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  end_date?: string | null;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  is_current!: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cause?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}
