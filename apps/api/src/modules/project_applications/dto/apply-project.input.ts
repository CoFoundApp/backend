import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ApplyProjectInput {
  @Field(() => String)
  project_id!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String, { nullable: true })
  position_id?: string;
}
