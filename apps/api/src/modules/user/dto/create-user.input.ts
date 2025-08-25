import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../../../common/enums/domain.enums';

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  password!: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(UserRole))
  role?: UserRole;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}
