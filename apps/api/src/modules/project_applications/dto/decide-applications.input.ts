import { InputType, Field } from '@nestjs/graphql';
import { ApplicationStatus } from '../../../common/enums/domain.enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

@InputType()
export class DecideApplicationInput {
  @Field(() => ApplicationStatus)
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
