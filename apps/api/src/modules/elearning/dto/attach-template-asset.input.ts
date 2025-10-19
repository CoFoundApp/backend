import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

@InputType()
export class AttachTemplateAssetInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  lessonId?: string | null;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  label!: string;

  @Field(() => String)
  @IsUrl()
  fileUrl!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(120)
  kind!: string;
}
