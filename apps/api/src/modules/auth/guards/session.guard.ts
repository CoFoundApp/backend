import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { buildAuthSetCookies } from '../../../common/utils/cookies.util';

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

    if (!access) throw new UnauthorizedException('No access token');

    try {
      const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET || 'dev-access');
      (req as any).user = payload;
      return true;
    } catch (e: any) {
      if (e?.name !== 'TokenExpiredError') {
        throw new UnauthorizedException('Invalid token');
      }

      // Access token expiré, essayer le refresh
      const rt = readRefresh(req);
      if (!rt) throw new UnauthorizedException('No refresh token');

      let refreshPayload: any;
      try {
        refreshPayload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET || 'dev-refresh');
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const sub = refreshPayload?.sub;
      const jti = refreshPayload?.jti;
      const role = String(refreshPayload?.role ?? 'user');

      if (!sub || !jti) throw new UnauthorizedException('Bad refresh payload');

      try {
        // ✅ UTILISER LA MÉTHODE REFRESH DU SERVICE QUI VÉRIFIE REDIS
        const { accessToken, refreshToken } = await this.auth.refresh(sub, jti, role);

        // Définir les nouveaux cookies
        const setCookies = buildAuthSetCookies(req, { accessToken, refreshToken });
        setCookies.forEach((c) => res.append('Set-Cookie', c));

        // Décoder le nouveau token pour l'utilisateur
        const newPayload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || 'dev-access');
        (req as any).user = newPayload;

        return true;
      } catch (refreshError) {
        // Le refresh a échoué (token révoqué, expiré, etc.)
        throw new UnauthorizedException('Session expired, please login again');
      }
    }
  }
}
