import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { JSONScalar } from '../../../common/scalars/json.scalar';
import { BlockKind } from '../elearning.enums';

@InputType()
export class UpsertBlockInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String)
  @IsUUID()
  lessonId!: string;

  @Field(() => BlockKind)
  @IsEnum(BlockKind)
  kind!: BlockKind;

  @Field(() => JSONScalar)
  dataJson!: Record<string, any>;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number | null;
}
