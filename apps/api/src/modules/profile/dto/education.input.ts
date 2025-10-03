import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class EducationInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsString()
  school!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  degree?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  field_of_study?: string | null;

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
  grade?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}
