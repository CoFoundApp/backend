import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectPositionInput {
  @Field(() => String)
  project_id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}
