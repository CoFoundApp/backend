import { InputType, Field, ID } from '@nestjs/graphql';
import { IsIn, IsOptional } from 'class-validator';
import { UserRole, UserStatus } from '../../../common/enums/domain.enums';

@InputType()
export class UpdateUserInput {
  @Field(() => ID)
  id!: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(UserRole))
  role?: UserRole;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}
