import { Inject, Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EMAIL_PROVIDER, EmailProvider } from './email.types';

interface LoadedTemplate {
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class TemplateMailerService {
  private layoutLoaded = false;

  constructor(@Inject(EMAIL_PROVIDER) private readonly email: EmailProvider) {}

  private async loadTemplate(name: string, locale: string): Promise<LoadedTemplate | null> {
  const base = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../src/infra/email/templates')
    : path.join(__dirname, 'templates');
    const attempt = async (loc: string) => {
      try {
        const subject = await fs.readFile(path.join(base, loc, `${name}.subject.hbs`), 'utf8');
        const html = await fs.readFile(path.join(base, loc, `${name}.html.hbs`), 'utf8');
        let text: string | undefined;
        try {
          text = await fs.readFile(path.join(base, loc, `${name}.text.hbs`), 'utf8');
        } catch {}
        return { subject, html, text };
      } catch {
        return null;
      }
    };
    return (await attempt(locale)) ?? (await attempt('en'));
  }

  private async ensureLayout() {
    if (this.layoutLoaded) return;
    try {
      const layoutPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '../../../src/infra/email/templates', 'layout.html.hbs')
        : path.join(__dirname, 'templates', 'layout.html.hbs');
      const layout = await fs.readFile(layoutPath, 'utf8');
      Handlebars.registerPartial('layout', layout);
      this.layoutLoaded = true;
    } catch (error) {
      console.error('Erreur lors du chargement du template layout:', error);
      throw error;
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    locale: string,
    data: Record<string, any>,
  ) {
    const template = await this.loadTemplate(templateName, locale);
    if (!template) {
      console.error(`Template '${templateName}' non trouvé pour locale '${locale}' ni fallback 'en'`);
      return;
    }

    await this.ensureLayout();

    const base = {
      brand_name: process.env.BRAND_NAME ?? 'CoFound',
      brand_url: process.env.BRAND_URL ?? '',
      brand_logo_url: process.env.BRAND_LOGO_URL ?? '',
      app_name: process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound',
      unsubscribe_url: process.env.APP_BASE_URL
        ? `${process.env.APP_BASE_URL}/settings/notifications`
        : undefined,
    };

    const merged = {
      ...base,
      ...data,
      year: new Date().getFullYear(),
      lang: locale,
    };

    let subject: string;
    let html: string;
    let text: string | undefined;

    try {
      subject = Handlebars.compile(template.subject)(merged);
      html = Handlebars.compile(template.html)({ ...merged, subject });
      text = template.text ? Handlebars.compile(template.text)({ ...merged, subject }) : undefined;
    } catch (err) {
      console.error('Erreur dans la compilation des templates:', err);
      return;
    }

    try {
      await this.email.send(to, subject, html, text);
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'email:', err);
    }
  }
}
