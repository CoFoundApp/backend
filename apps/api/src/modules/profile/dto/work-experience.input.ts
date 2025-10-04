import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class WorkExperienceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String)
  @IsString()
  company!: string;

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
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  location?: string | null;
}
