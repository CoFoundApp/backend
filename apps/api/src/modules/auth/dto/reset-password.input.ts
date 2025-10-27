import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsString()
  token!: string;

  @Field()
  @MinLength(8)
  password!: string;
}
