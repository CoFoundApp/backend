import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const type = context.getType<'http' | 'graphql' | 'ws'>();
    let user: any;

    if (type === 'http') user = context.switchToHttp().getRequest()?.user;
    if (type === 'graphql') {
      const g = GqlExecutionContext.create(context);
      user = g.getContext()?.req?.user;
    }
    if (!user?.role) return false;
    return required.includes(String(user.role));
  }
}
