import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, Matches } from 'class-validator';

@InputType()
export class RequestPasswordResetInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  locale?: string;
}
