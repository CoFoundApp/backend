import { Global, Module } from '@nestjs/common';
import { SmtpEmailProvider } from './smtp.provider';
import { TemplateMailerService } from './template-mailer.service';
import { EMAIL_PROVIDER } from './email.types';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useClass: SmtpEmailProvider,
    },
    TemplateMailerService,
  ],
  exports: [EMAIL_PROVIDER, TemplateMailerService],
})
export class EmailModule {}
