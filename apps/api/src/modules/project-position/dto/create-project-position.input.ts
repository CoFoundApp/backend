import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateProjectPositionInput {
  @Field(() => String)
  @IsString()
  project_id!: string;

  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}
