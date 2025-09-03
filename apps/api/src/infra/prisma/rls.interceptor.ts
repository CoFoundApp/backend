import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';
import { RequestContext } from './request-context.service';
import { GqlExecutionContext } from '@nestjs/graphql';

function extractUser(ctx: ExecutionContext) {
  const type = ctx.getType<'http'|'graphql'|'ws'>();
  if (type === 'http') return ctx.switchToHttp().getRequest()?.user;
  if (type === 'graphql') {
    const g = GqlExecutionContext.create(ctx);
    return g.getContext()?.req?.user;
  }
  return undefined;
}

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService, private readonly rc: RequestContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user = extractUser(context);
    const userId: string | null = user?.sub ?? null;
    const role: string | null = user?.role ?? null;

    // Ouvre une transaction et injecte tx dans ALS pour toute la requête
    const work = this.prisma.$transaction(async (tx) => {
      if (userId) await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      if (role)   await tx.$executeRaw`SELECT set_config('app.role',   ${role},   true)`;


      return this.rc.run({ tx, userId, role }, async () => {
        // Nest appelle next.handle() (Observable), on attend son completion
        const result$ = next.handle();
        return await lastValueFrom(result$);
      });
    });

    return from(work);
  }
}
