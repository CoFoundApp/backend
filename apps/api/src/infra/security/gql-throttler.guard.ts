import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const type = context.getType<'http' | 'graphql' | 'ws'>();
    if (type === 'http') {
      const http = context.switchToHttp();
      return { req: http.getRequest(), res: http.getResponse() };
    }
    if (type === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const { req, res } = (gqlCtx.getContext() as { req?: any; res?: any }) ?? {};
      return { req, res };
    }
    return { req: undefined, res: undefined };
  }

  /** Identifiant client (clé de throttling) */
  protected async getTracker(req: any): Promise<string> {
    if (!req) return Promise.resolve('anon');
    const xff = (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return Promise.resolve(xff || req.ip || req.socket?.remoteAddress || req.ips?.[0] || 'anon');
  }
}
