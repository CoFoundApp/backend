import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import type { Request, Response } from 'express';
import { AppException } from './app-exception';
import { I18nService } from '../i18n/i18n.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter, GqlExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<'graphql'>() === 'graphql') {
      return this.handleGraphql(exception, host);
    }
    return this.handleHttp(exception, host);
  }

  private handleHttp(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { headers?: Record<string, string>; user?: { locale?: string } }>();
    const locale = this.resolveLocale(request?.user?.locale);

    const { statusCode, code, message, details } = this.extractError(exception, locale);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`HTTP ${statusCode} ${code}: ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: (request as any)?.url,
    });
  }

  private handleGraphql(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext<{ req?: { headers?: Record<string, string>; user?: { locale?: string } } }>();
    const locale = this.resolveLocale(ctx?.req?.user?.locale);

    const { statusCode, code, message, details } = this.extractError(exception, locale);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`GraphQL ${statusCode} ${code}: ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    return new GraphQLError(message, {
      extensions: {
        code,
        http: { status: statusCode },
        details,
      },
    });
  }

  private extractError(exception: unknown, locale: string | undefined) {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        message: this.i18n.translate(exception.code, locale, { params: exception.context.params }),
        details: exception.context.details,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();
      const message = this.getMessageFromResponse(response);

      return {
        statusCode: status,
        code: this.inferCodeFromStatus(status, message),
        message: this.i18n.translate(this.inferCodeFromStatus(status, message), locale, {
          fallback: typeof message === 'string' ? message : undefined,
        }),
        details: typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : undefined,
      };
    }

    const code = 'common.internal';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code,
      message: this.i18n.translate(code, locale),
      details: undefined,
    };
  }

  private inferCodeFromStatus(status: number, message: string | undefined): string {
    if (message && message !== 'Error') {
      const normalized = this.normalizeMessageKey(message);
      const mapped = this.messageCodeMap[normalized];
      if (mapped) return mapped;
      return normalized;
    }

    return this.statusCodeMap[status] ?? 'common.internal';
  }

  private normalizeMessageKey(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }

  private getMessageFromResponse(response: unknown): string | undefined {
    if (!response) return undefined;
    if (typeof response === 'string') return response;
    if (typeof response === 'object') {
      const res = response as Record<string, unknown>;
      if (typeof res.message === 'string') {
        return res.message;
      }
      if (Array.isArray(res.message) && typeof res.message[0] === 'string') {
        return res.message[0];
      }
    }
    return undefined;
  }

  private readonly messageCodeMap: Record<string, string> = {
    unauthorized: 'auth.unauthorized',
    forbidden: 'common.forbidden',
    'not.found': 'common.notFound',
    'bad.request': 'common.badRequest',
  };

  private readonly statusCodeMap: Record<number, string> = {
    [HttpStatus.UNAUTHORIZED]: 'auth.unauthorized',
    [HttpStatus.FORBIDDEN]: 'common.forbidden',
    [HttpStatus.NOT_FOUND]: 'common.notFound',
    [HttpStatus.BAD_REQUEST]: 'common.badRequest',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'common.serviceUnavailable',
  };

  private resolveLocale(userLocale?: string): string {
    if (userLocale) {
      return userLocale;
    }
    return 'fr';
  }
}
