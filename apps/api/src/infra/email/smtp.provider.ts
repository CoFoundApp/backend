import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailProvider } from './email.types';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'pro3.mail.ovh.net',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  async send(to: string, subject: string, html: string, text?: string) {
    await this.transporter.sendMail({
       from: {
        name: process.env.SMTP_FROM_NAME || 'CoFound',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!,
      },
      to,
      subject,
      html,
      text,
    });
  }
}
