import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Issuer, Client, generators } from 'openid-client';
import type Redis from 'ioredis';
import { REDIS } from '../../infra/redis/redis.module';
import { OAuthProvider } from './dto/oauth-provider.enum';

interface ProviderConfig {
  issuer: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
}

interface StoredOAuthState {
  provider: OAuthProvider;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
}

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

const PROVIDER_CONFIG: Record<OAuthProvider, ProviderConfig> = {
  [OAuthProvider.Google]: {
    issuer: 'https://accounts.google.com',
    scope: 'openid email profile',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  [OAuthProvider.LinkedIn]: {
    issuer: 'https://www.linkedin.com',
    scope: 'openid email profile',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },
};

const STATE_PREFIX = 'oauth-state';
const STATE_TTL_SECONDS = 600;

@Injectable()
export class OAuthService {
  private readonly clients = new Map<OAuthProvider, Promise<Client>>();

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private validateRedirectUri(redirectUri: string) {
    let target: URL;
    try {
      target = new URL(redirectUri);
    } catch {
      throw new BadRequestException('Invalid redirect URI');
    }

    const allowedBase = process.env.APP_BASE_URL;
    if (allowedBase) {
      let allowed: URL;
      try {
        allowed = new URL(allowedBase);
      } catch {
        throw new BadRequestException('Invalid server configuration for APP_BASE_URL');
      }

      if (allowed.origin !== target.origin) {
        throw new BadRequestException('Redirect URI is not allowed');
      }
    }

    return target.toString();
  }

  private getClient(provider: OAuthProvider): Promise<Client> {
    if (!this.clients.has(provider)) {
      const config = PROVIDER_CONFIG[provider];
      if (!config) {
        throw new BadRequestException('Unsupported provider');
      }
      const clientPromise = Issuer.discover(config.issuer).then((issuer) => {
        const clientId = process.env[config.clientIdEnv];
        const clientSecret = process.env[config.clientSecretEnv];
        if (!clientId || !clientSecret) {
          throw new BadRequestException(`${config.clientIdEnv} or ${config.clientSecretEnv} missing`);
        }
        return new issuer.Client({
          client_id: clientId,
          client_secret: clientSecret,
        });
      });
      this.clients.set(provider, clientPromise);
    }
    return this.clients.get(provider)!;
  }

  private buildStateKey(state: string) {
    return `${STATE_PREFIX}:${state}`;
  }

  async createAuthorizationUrl(provider: OAuthProvider, redirectUri: string) {
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
      throw new BadRequestException('Unsupported provider');
    }

    const safeRedirect = this.validateRedirectUri(redirectUri);
    const client = await this.getClient(provider);
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const url = client.authorizationUrl({
      scope: config.scope,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: safeRedirect,
    });

    const store: StoredOAuthState = {
      provider,
      codeVerifier,
      nonce,
      redirectUri: safeRedirect,
    };

    await this.redis.set(this.buildStateKey(state), JSON.stringify(store), 'EX', STATE_TTL_SECONDS);
    return { url, state };
  }

  async consumeAuthorizationCode(provider: OAuthProvider, params: Record<string, string | undefined>) {
    const state = params.state;
    const code = params.code;

    if (!state || !code) {
      throw new BadRequestException('Missing state or code');
    }

    const storedRaw = await this.redis.get(this.buildStateKey(state));
    if (!storedRaw) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }
    await this.redis.del(this.buildStateKey(state));

    let stored: StoredOAuthState;
    try {
      stored = JSON.parse(storedRaw) as StoredOAuthState;
    } catch {
      throw new BadRequestException('Invalid OAuth state payload');
    }

    if (stored.provider !== provider) {
      throw new BadRequestException('Provider mismatch');
    }

    const client = await this.getClient(provider);
    const tokenSet = await client.callback(stored.redirectUri, params, {
      state,
      nonce: stored.nonce,
      code_verifier: stored.codeVerifier,
    });

    const claims = tokenSet.claims();
    const userInfo = await client.userinfo(tokenSet).catch(() => null);

    const email = (userInfo as any)?.email ?? (claims as any)?.email;
    const emailVerified = Boolean((userInfo as any)?.email_verified ?? (claims as any)?.email_verified);
    const providerUserId = (userInfo as any)?.sub ?? (claims as any)?.sub;
    const givenName = (userInfo as any)?.given_name ?? (claims as any)?.given_name;
    const familyName = (userInfo as any)?.family_name ?? (claims as any)?.family_name;
    const picture = (userInfo as any)?.picture ?? (claims as any)?.picture;

    if (!email || !providerUserId) {
      throw new BadRequestException('Provider did not return required profile information');
    }

    const profile: OAuthProfile = {
      provider,
      providerUserId: String(providerUserId),
      email: String(email).toLowerCase(),
      emailVerified,
      givenName: givenName ? String(givenName) : undefined,
      familyName: familyName ? String(familyName) : undefined,
      picture: picture ? String(picture) : undefined,
    };

    return { profile, redirectUri: stored.redirectUri };
  }
}
