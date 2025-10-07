import { IsOptional, IsUrl } from 'class-validator';

export class CustomerPortalSessionDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
