import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, Matches, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  locale?: string;
}
