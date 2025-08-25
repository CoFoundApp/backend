import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ConsentRecord {
  @Field(() => ID)
  id!: string;

  @Field()
  consent_type!: string;

  @Field()
  granted!: boolean;

  @Field()
  granted_at!: Date;

  @Field(() => String, { nullable: true })
  ip_address?: string | null;

  @Field(() => String, { nullable: true })
  user_agent?: string | null;

  @Field(() => String, { nullable: true, description: 'JSON string, optional' })
  metadata?: string | null;
}

@ObjectType()
export class ConsentCurrent {
  @Field()
  consent_type!: string;

  @Field()
  granted!: boolean;

  @Field()
  granted_at!: Date;
}
