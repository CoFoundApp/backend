import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { computeCookiePolicy } from '../../../common/utils/cookies.util';

const readAccess = (req: Request) =>
  req.cookies?.['access_token'] ?? (req.headers.authorization?.replace(/^Bearer\s+/i, '') || null);
const readRefresh = (req: Request) => req.cookies?.['refresh_token'] ?? null;

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
      throw new UnauthorizedException('No access token');
    }

    try {
      const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET || 'dev-access');
      (req as any).user = payload;
      return true;
    } catch (e: any) {
      if (e?.name !== 'TokenExpiredError') {
        console.log('❌ Invalid access token:', e?.message);
        this.clearCookiesSafely(req, res);
        throw new UnauthorizedException('Invalid token');
      }

      console.log('🔄 Access token expired, attempting refresh...');

      if (!rt) {
        console.log('❌ No refresh token available');
        this.clearCookiesSafely(req, res);
        throw new UnauthorizedException('No refresh token');
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
      refreshPayload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET || 'dev-refresh');
    } catch (jwtError: any) {
      console.log('❌ Invalid refresh token JWT:', jwtError?.message);
      this.clearCookiesSafely(req, res);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sub = refreshPayload?.sub;
    const jti = refreshPayload?.jti;
    const role = String(refreshPayload?.role ?? 'user');

    if (!sub || !jti) {
      console.log('❌ Bad refresh payload:', { sub, jti });
      this.clearCookiesSafely(req, res);
      throw new UnauthorizedException('Bad refresh payload');
    }

    try {
      console.log('🔄 Refreshing tokens...', { sub, jti, role });

      const { accessToken, refreshToken } = await this.auth.refresh(sub, jti, role);

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

      const newPayload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || 'dev-access');
      (req as any).user = newPayload;

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

      throw new UnauthorizedException('Session expired, please login again');
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
}
