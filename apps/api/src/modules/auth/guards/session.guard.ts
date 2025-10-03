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

    if (!access) {
      console.log('⚠️ No access token provided');
      throw new UnauthorizedException('No access token');
    }

    try {
      const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET || 'dev-access');
      (req as any).user = payload;
      return true;
    } catch (e: any) {
      if (e?.name !== 'TokenExpiredError') {
        console.log('❌ Invalid access token:', e?.message);
        throw new UnauthorizedException('Invalid token');
      }

      console.log('🔄 Access token expired, attempting refresh...');

      const rt = readRefresh(req);
      if (!rt) {
        console.log('❌ No refresh token available');
        throw new UnauthorizedException('No refresh token');
      }

      let refreshPayload: any;
      try {
        refreshPayload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET || 'dev-refresh');
      } catch (jwtError: any) {
        console.log('❌ Invalid refresh token JWT:', jwtError?.message);

        // ✅ CORRIGÉ: Ne supprime les cookies que si le JWT est invalide/expiré
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

        // ✅ CORRIGÉ: Ne supprime les cookies que si c'est une erreur d'authentification
        // Pas en cas d'erreur Redis temporaire
        const isAuthError =
          refreshError instanceof UnauthorizedException ||
          refreshError?.message?.includes('revoked') ||
          refreshError?.message?.includes('invalid');

        if (isAuthError) {
          console.log('🗑️ Auth error detected, clearing cookies');
          this.clearCookiesSafely(req, res);
          throw new UnauthorizedException('Session expired, please login again');
        } else {
          console.log('⚠️ Temporary error, NOT clearing cookies');
          throw new UnauthorizedException('Service temporarily unavailable, please retry');
        }
      }
    }
  }

  /**
   * ✅ NOUVEAU: Méthode sécurisée pour supprimer les cookies
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
