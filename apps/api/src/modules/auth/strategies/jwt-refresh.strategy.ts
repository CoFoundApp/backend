import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Rafraîchissement: on lit le token depuis l'en-tête "x-refresh-token"
 * (plus simple avec GraphQL que les cookies). Tu pourras passer aux cookies httpOnly plus tard.
 */
function fromXRefreshHeader(req: any): string | null {
  const t = req?.headers?.['x-refresh-token'];
  return typeof t === 'string' ? t : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromXRefreshHeader,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // fallback si besoin
      ]),
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'dev-refresh',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // payload = { sub, role, jti, iat, exp }
    return payload;
  }
}
