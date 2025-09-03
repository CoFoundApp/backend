import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Project } from '../../projects/project.type';

@ObjectType()
export class ProjectMatch {
  @Field(() => Project)
  project!: Project;

  @Field(() => Float)
  distance!: number;

  @Field(() => Float)
  score!: number;

  @Field(() => [String])
  reasons!: string[];
}
