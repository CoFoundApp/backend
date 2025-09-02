import { Global, Module } from '@nestjs/common';
import { SmtpEmailProvider } from './smtp.provider';

export interface EmailProvider {
  send(to: string, subject: string, html: string, text?: string): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useClass: SmtpEmailProvider,
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
