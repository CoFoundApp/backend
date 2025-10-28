import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtUser {
  sub: string;
  role: string;
  jti?: string;
  locale?: 'fr' | 'en';
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser | null => {
    const type = ctx.getType<'http' | 'graphql'>();
    if (type === 'http') {
      const req = ctx.switchToHttp().getRequest();
      return req.user ?? null;
    }
    if (type === 'graphql') {
      const g = GqlExecutionContext.create(ctx);
      const gqlCtx = g.getContext();
      return (
        (gqlCtx?.req?.user as JwtUser) ??
        (gqlCtx?.connection?.context?.user as JwtUser) ??
        (gqlCtx?.extra?.user as JwtUser) ??
        null
      );
    }
    return null;
  },
);
