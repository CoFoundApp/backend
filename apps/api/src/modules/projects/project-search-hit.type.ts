import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Project } from './project.type';

@ObjectType()
export class ProjectSearchHit {
  @Field(() => Project)
  project!: Project;

  @Field(() => Float)
  score!: number;

  @Field(() => [String])
  reasons!: string[];
}
