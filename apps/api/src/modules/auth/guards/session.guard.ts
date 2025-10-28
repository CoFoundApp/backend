import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { computeCookiePolicy } from '../../../common/utils/cookies.util';
import { AppError } from '../../../common/errors/app-error.factory';

const readAccess = (req: Request) =>
  req.cookies?.['access_token'] ?? (req.headers.authorization?.replace(/^Bearer\s+/i, '') || null);
const readRefresh = (req: Request) => req.cookies?.['refresh_token'] ?? null;

const ACCESS_TOKEN_SECRET: Secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access';
const REFRESH_TOKEN_SECRET: Secret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req, res } = ctx.getContext<{ req: Request; res: Response }>();

    const access = readAccess(req);
    const rt = readRefresh(req);

    if (!access && rt) {
      console.log('⚠️ No access token but refresh token present, attempting refresh...');
      return this.attemptRefresh(req, res, rt);
    }

    if (!access) {
      console.log('❌ No access token and no refresh token');
      this.clearCookiesSafely(req, res);
      throw AppError.unauthorized('no.access.token');
    }

    try {
      const payload = jwt.verify(access, ACCESS_TOKEN_SECRET);
      await this.decorateRequestUser(req, payload);
      return true;
    } catch (e: any) {
      if (e?.name !== 'TokenExpiredError') {
        console.log('❌ Invalid access token:', e?.message);
        this.clearCookiesSafely(req, res);
        throw AppError.unauthorized('invalid.token');
      }

      console.log('🔄 Access token expired, attempting refresh...');

      if (!rt) {
        console.log('❌ No refresh token available');
        this.clearCookiesSafely(req, res);
        throw AppError.unauthorized('no.refresh.token');
      }

      return this.attemptRefresh(req, res, rt);
    }
  }

  /**
   * ✅ NOUVEAU: Méthode centralisée pour tenter le refresh
   */
  private async attemptRefresh(req: Request, res: Response, rt: string): Promise<boolean> {
    let refreshPayload: any;
    try {
      refreshPayload = jwt.verify(rt, REFRESH_TOKEN_SECRET);
    } catch (jwtError: any) {
      console.log('❌ Invalid refresh token JWT:', jwtError?.message);
      this.clearCookiesSafely(req, res);
      throw AppError.unauthorized('invalid.refresh.token');
    }

    const sub = refreshPayload?.sub;
    const jti = refreshPayload?.jti;
    const role = String(refreshPayload?.role ?? 'user');

    if (!sub || !jti) {
      console.log('❌ Bad refresh payload:', { sub, jti });
      this.clearCookiesSafely(req, res);
      throw AppError.unauthorized('bad.refresh.payload');
    }

    try {
      console.log('🔄 Refreshing tokens...', { sub, jti, role });

      const { accessToken, refreshToken } = await this.auth.refresh(sub, jti, role);

      if (!accessToken || !refreshToken) {
        console.log('❌ Refresh endpoint did not return both tokens');
        this.clearCookiesSafely(req, res);
        throw AppError.unauthorized('invalid.refresh.response');
      }

      const cookiePolicy = computeCookiePolicy(req);

      const baseCookieOptions = {
        httpOnly: true,
        secure: cookiePolicy.secure,
        sameSite: cookiePolicy.sameSite as 'lax' | 'none' | 'strict',
        path: '/',
        ...(cookiePolicy.domain ? { domain: cookiePolicy.domain } : {}),
      };

      res.cookie('access_token', accessToken, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', refreshToken, {
        ...baseCookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      console.log('✅ Tokens refreshed successfully');

      const newPayload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
      await this.decorateRequestUser(req, newPayload);

      return true;
    } catch (refreshError: any) {
      console.log('❌ Auto-refresh failed:', {
        error: refreshError?.message || refreshError,
        type: refreshError?.constructor?.name,
        sub,
        jti,
      });

      console.log('🗑️ Clearing cookies to prevent redirect loop');
      this.clearCookiesSafely(req, res);

      throw AppError.unauthorized('session.expired.please.login.again');
    }
  }

  /**
   * ✅ Méthode sécurisée pour supprimer les cookies
   */
  private clearCookiesSafely(req: Request, res: Response): void {
    const cookiePolicy = computeCookiePolicy(req);

    const clearOptions = {
      httpOnly: true,
      secure: cookiePolicy.secure,
      sameSite: cookiePolicy.sameSite as 'lax' | 'none' | 'strict',
      path: '/',
      expires: new Date(1),
      ...(cookiePolicy.domain ? { domain: cookiePolicy.domain } : {}),
    };

    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);
  }

  private async decorateRequestUser(req: Request, payload: string | JwtPayload): Promise<void> {
    if (typeof payload !== 'object' || payload === null) {
      (req as any).user = payload;
      return;
    }

    const basePayload = payload as JwtPayload & { sub?: string | null };
    const context = await this.auth.resolveSessionContext(
      typeof basePayload.sub === 'string' ? basePayload.sub : null,
    );

    (req as any).user = { ...basePayload, ...context };
  }
}
