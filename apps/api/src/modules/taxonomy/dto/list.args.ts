import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

@ArgsType()
export class ListArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  q?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string | null;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number | null;

  @Field(() => String, { nullable: true, description: 'cursor id' })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
