import { InputType, Field } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';

@InputType()
export class ApplyProjectInput {
  @Field(() => String)
  project_id!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String, { nullable: true })
  position_id?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachment_urls?: string[] | null;

  @Field(() => [GraphQLUpload], { nullable: true })
  @IsOptional()
  @IsArray()
  attachments?: FileUpload[] | null;
}
