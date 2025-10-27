import { Field, InputType } from '@nestjs/graphql';
import { OAuthProvider } from './oauth-provider.enum';

@InputType()
export class CompleteOAuthInput {
  @Field(() => OAuthProvider)
  provider!: OAuthProvider;

  @Field()
  code!: string;

  @Field()
  state!: string;

  @Field({ nullable: true })
  idToken?: string;
}
