import { HttpStatus } from '@nestjs/common';
import type { AppErrorCode } from '../i18n/i18n.service';
import { AppException, type AppExceptionOptions } from './app-exception';

export const AppError = {
  badRequest(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.BAD_REQUEST, code, options);
  },
  unauthorized(code: AppErrorCode = 'auth.unauthorized', options?: AppExceptionOptions) {
    return new AppException(HttpStatus.UNAUTHORIZED, code, options);
  },
  forbidden(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.FORBIDDEN, code, options);
  },
  notFound(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.NOT_FOUND, code, options);
  },
  conflict(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.CONFLICT, code, options);
  },
  tooManyRequests(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.TOO_MANY_REQUESTS, code, options);
  },
  serviceUnavailable(code: AppErrorCode, options?: AppExceptionOptions) {
    return new AppException(HttpStatus.SERVICE_UNAVAILABLE, code, options);
  },
  internal(code: AppErrorCode = 'common.internal', options?: AppExceptionOptions) {
    return new AppException(HttpStatus.INTERNAL_SERVER_ERROR, code, options);
  },
} as const;
