import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { OAuthProvider } from './oauth-provider.enum';

@InputType()
export class CompleteOAuthInput {
  @Field(() => OAuthProvider)
  @IsNotEmpty()
  provider!: OAuthProvider;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  code!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  state!: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  idToken?: string;
}
