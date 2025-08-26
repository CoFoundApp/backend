import { ObjectType, Field } from '@nestjs/graphql';
import { Skill } from '../../taxonomy/types/skill.type';

@ObjectType()
export class SkillMatch {
  @Field(() => Skill)
  item!: Skill;

  @Field(() => Number, { description: 'Cosine distance (plus petit = plus proche)' })
  distance!: number;
}
