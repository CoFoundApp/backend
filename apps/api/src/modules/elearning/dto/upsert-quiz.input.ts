import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

@InputType()
export class UpsertQuizInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsUUID()
  lessonId!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(240)
  title!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  passScore?: number | null;
}
