import { HttpException, HttpStatus } from '@nestjs/common';
import type { AppErrorCode } from '../i18n/i18n.service';

export interface AppExceptionOptions {
  readonly params?: Record<string, string | number>;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class AppException extends HttpException {
  readonly statusCode: HttpStatus;
  readonly code: AppErrorCode;
  readonly context: AppExceptionOptions;

  constructor(
    statusCode: HttpStatus,
    code: AppErrorCode,
    options: AppExceptionOptions = {},
  ) {
    const { cause, ...rest } = options;
    super({ code, ...rest }, statusCode, { cause });
    this.statusCode = statusCode;
    this.code = code;
    this.context = options;
  }
}
