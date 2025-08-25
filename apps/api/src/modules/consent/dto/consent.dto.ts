import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class SetConsentInput {
  @Field()
  @IsString()
  consent_type!: string;

  @Field()
  @IsBoolean()
  granted!: boolean;

  @Field(() => String, { nullable: true, description: 'JSON (string), optionnel' })
  @IsOptional()
  @IsString()
  metadataJson?: string | null;
}
