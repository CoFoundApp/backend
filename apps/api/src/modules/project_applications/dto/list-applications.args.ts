import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums/domain.enums';

@ArgsType()
export class ListApplicationsArgs {
  @Field(() => ApplicationStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus | null;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  limit?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
