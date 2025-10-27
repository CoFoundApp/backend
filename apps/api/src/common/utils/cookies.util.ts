import type { Request } from 'express';
import { serialize, SerializeOptions } from 'cookie';

type Tokens = { accessToken: string; refreshToken: string };

/**
 * Détermine la politique de cookies en fonction du contexte de la requête
 */
export function computeCookiePolicy(req: Request): {
  secure: boolean;
  sameSite: 'lax' | 'none';
  domain?: string;
} {
  const baseDomain = process.env.COOKIE_BASE_DOMAIN || '.cofounds.app.com';
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';

  // Détecte si on est derrière un proxy HTTPS
  const xfProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const isHttps = xfProto === 'https' || (req as any).secure === true;

  const isLocalOrigin = /^https?:\/\/localhost(:\d+)?$/.test(origin);
  const isProductionAPI = host.includes('.cofounds.app.com');
  const isProductionOrigin = origin.includes('.cofounds.app.com');

  // Cas 1: Local frontend → Production API (dev cross-domain)
  if (isLocalOrigin && isProductionAPI) {
    console.log('🍪 Cookie policy: Local→Prod (SameSite=None, Secure=true, Domain=' + baseDomain + ')');
    return {
      secure: true,
      sameSite: 'none',
      domain: baseDomain
    };
  }

  // Cas 2: Local frontend → Local API (dev same-domain)
  if (isLocalOrigin && /^localhost(:\d+)?$/.test(host)) {
    console.log('🍪 Cookie policy: Local→Local (SameSite=Lax, Secure=false, no Domain)');
    return {
      secure: false,
      sameSite: 'lax',
      domain: undefined
    };
  }

  // Cas 3: Production → Production (same-domain)
  if (isProductionOrigin && isProductionAPI) {
    console.log('🍪 Cookie policy: Prod→Prod (SameSite=Lax, Secure=true, Domain=' + baseDomain + ')');
    return {
      secure: true,
      sameSite: 'lax',
      domain: baseDomain
    };
  }

  // Cas 4: Fallback (utilise HTTPS si détecté)
  console.log('🍪 Cookie policy: Fallback (Secure=' + isHttps + ', SameSite=Lax, Domain=' + baseDomain + ')');
  return {
    secure: isHttps,
    sameSite: 'lax',
    domain: baseDomain
  };
}

/**
 * ✅ CORRIGÉ: Utilise maintenant cookiePolicy.domain au lieu de hardcoder
 */
export function setAuthCookies(res: any, req: Request, tokens: Tokens) {
  const cookiePolicy = computeCookiePolicy(req);

  const opts = {
    httpOnly: true,
    secure: cookiePolicy.secure,
    sameSite: cookiePolicy.sameSite as 'lax' | 'none' | 'strict',
    path: '/',
    ...(cookiePolicy.domain ? { domain: cookiePolicy.domain } : {}),
  };

  res.cookie('access_token', tokens.accessToken, {
    ...opts,
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    ...opts,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  console.log('✅ Cookies set:', {
    domain: cookiePolicy.domain || 'none',
    secure: cookiePolicy.secure,
    sameSite: cookiePolicy.sameSite,
  });
}

export function clearAuthCookies(res: any, req: Request) {
  const cookiePolicy = computeCookiePolicy(req);

  const clearOpts = {
    httpOnly: true,
    secure: cookiePolicy.secure,
    sameSite: cookiePolicy.sameSite as 'lax' | 'none' | 'strict',
    path: '/',
    expires: new Date(1),
    ...(cookiePolicy.domain ? { domain: cookiePolicy.domain } : {}),
  };

  // Supprime avec la config actuelle
  res.clearCookie('access_token', clearOpts);
  res.clearCookie('refresh_token', clearOpts);

  // Supprime aussi avec toutes les variations possibles (cleanup)
  const domainsToClean = [
    undefined,
    '.cofounds.app.com',
    'localhost',
  ];

  domainsToClean.forEach(domain => {
    res.clearCookie('access_token', { ...clearOpts, domain });
    res.clearCookie('refresh_token', { ...clearOpts, domain });
  });

  console.log('🗑️ Cookies cleared');
}

export function buildAuthSetCookies(req: Request, tokens: Tokens) {
  const { secure, sameSite, domain } = computeCookiePolicy(req);

  const base: SerializeOptions = {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'none' | 'strict',
    path: '/',
    ...(domain ? { domain } : {}),
  };

  const cookies: string[] = [];
  cookies.push(serialize('access_token', tokens.accessToken, {
    ...base,
    maxAge: 15 * 60
  }));
  cookies.push(serialize('refresh_token', tokens.refreshToken, {
    ...base,
    maxAge: 30 * 24 * 60 * 60
  }));

  return cookies;
}

export function buildAuthClearCookies(req: Request) {
  const { secure, sameSite, domain } = computeCookiePolicy(req);

  const base: SerializeOptions = {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'none' | 'strict',
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  };

  return [
    serialize('access_token', '', base),
    serialize('refresh_token', '', base)
  ];
}
