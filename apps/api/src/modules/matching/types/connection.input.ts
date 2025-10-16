import { ObjectType, Field } from '@nestjs/graphql';
import { ProfileMatch } from './profile-match.type';
import { ProjectMatch } from './project-match.type';

@ObjectType()
export class ProfileMatchConnection {
  @Field(() => [ProfileMatch])
  items!: ProfileMatch[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;
}

@ObjectType()
export class ProjectMatchConnection {
  @Field(() => [ProjectMatch])
  items!: ProjectMatch[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;
}
