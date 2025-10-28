import { Injectable, Logger } from '@nestjs/common';
import { enErrors, type EnErrorKey } from './locales/en.errors';
import { frErrors } from './locales/fr.errors';

export type AppErrorCode = EnErrorKey | (string & {});

export interface TranslateOptions {
  readonly params?: Record<string, string | number>;
  readonly fallback?: string;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private readonly dictionaries: Record<string, Record<AppErrorCode, string>> = {
    en: enErrors,
    fr: frErrors,
  };

  constructor() {
    this.ensureLocaleParity();
  }

  translate(code: AppErrorCode, locale: string | undefined, options: TranslateOptions = {}): string {
    const normalizedLocale = this.normalizeLocale(locale);
    const dictionary = this.dictionaries[normalizedLocale] ?? this.dictionaries.en;
    const fallbackDictionary = this.dictionaries.en;

    const template = dictionary[code] ?? fallbackDictionary[code] ?? options.fallback ?? code;
    return this.interpolate(template, options.params);
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return Object.entries(params).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }, template);
  }

  private normalizeLocale(raw?: string): keyof typeof this.dictionaries {
    if (!raw) return 'fr';
    const lower = raw.toLowerCase();
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('en')) return 'en';
    return 'fr';
  }

  private ensureLocaleParity(): void {
    const enKeys = new Set(Object.keys(enErrors));
    const frKeys = new Set(Object.keys(frErrors));

    for (const key of enKeys) {
      if (!frKeys.has(key)) {
        this.logger.warn(`Missing French translation for error code: ${key}`);
      }
    }

    for (const key of frKeys) {
      if (!enKeys.has(key)) {
        this.logger.warn(`Missing English translation for error code: ${key}`);
      }
    }
  }
}
