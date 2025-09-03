import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const gqlCtx = ctx.getContext();
    return (
      gqlCtx.req ??
      gqlCtx.connection?.context?.req ??
      gqlCtx.connection?.context ??
      gqlCtx.extra?.req
    );
  }
}
