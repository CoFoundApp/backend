import type { Request } from 'express';
import { serialize, SerializeOptions } from 'cookie';

type Tokens = { accessToken: string; refreshToken: string };

export function buildAuthSetCookies(req: Request, tokens: Tokens) {
  const { secure, sameSite, domain, partitioned } = computePolicy(req);

  const base: SerializeOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    ...(partitioned ? {} : (domain ? { domain } : {})),
  };

  const cookies: string[] = [];
  const a = serialize('access_token', tokens.accessToken, { ...base, maxAge: 15 * 60 });
  const r = serialize('refresh_token', tokens.refreshToken, { ...base, maxAge: 30 * 24 * 60 * 60 });

  cookies.push(partitioned ? `${a}; Partitioned` : a);
  cookies.push(partitioned ? `${r}; Partitioned` : r);
  return cookies;
}

export function buildAuthClearCookies(req: Request) {
  const { secure, sameSite, domain, partitioned } = computePolicy(req);
  const base: SerializeOptions = {
    httpOnly: true, secure, sameSite, path: '/', maxAge: 0,
    ...(partitioned ? {} : (domain ? { domain } : {})),
  };
  const a = serialize('access_token', '', base);
  const r = serialize('refresh_token', '', base);
  return [partitioned ? `${a}; Partitioned` : a, partitioned ? `${r}; Partitioned` : r];
}


function computePolicy(req: Request): {
  secure: boolean;
  sameSite: 'lax'|'none';
  domain?: string;
  partitioned: boolean;
} {
  const env = process.env.NODE_ENV ?? 'development';
  const baseDomain = process.env.COOKIE_BASE_DOMAIN;
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  const xfProto = (req.headers['x-forwarded-proto'] as string|undefined)?.split(',')[0]?.trim();
  const isHttps = xfProto ? xfProto === 'https' : (req as any).secure === true;

  const isLocalOrigin = /^https?:\/\/localhost(:\d+)?$/.test(origin);
  const isLocalAPI = /^localhost(:\d+)?$/.test(host);

  // CAS 1: localhost → localhost  (same-site)
  if (isLocalOrigin && isLocalAPI) {
    return { secure: false, sameSite: 'lax', domain: undefined, partitioned: false };
  }

  // CAS 2: localhost → VPS (cross-site tiers)
  // On pose cookie "third-party partitionné" (CHIPS): SameSite=None; Secure; Partitioned
  if (isLocalOrigin && !isLocalAPI) {
    return { secure: true, sameSite: 'none', domain: baseDomain || undefined, partitioned: true };
  }

  // CAS 3: VPS → VPS (même eTLD+1: app.* ↔ api.*)
  // same-site en HTTPS
  if (!isLocalOrigin && !isLocalAPI) {
    return { secure: true, sameSite: 'lax', domain: baseDomain || undefined, partitioned: false };
  }

  // fallback sûr
  return { secure: isHttps || env === 'production', sameSite: 'lax', domain: baseDomain || undefined, partitioned: false };
}
