/**
 * auth0-management.service.ts
 *
 * Talks to the Auth0 Management API to:
 *  1. Obtain a short-lived M2M token via client_credentials.
 *  2. Fetch a user's identities and return the Google refresh_token that
 *     Auth0 stored during the social-login flow.
 *
 * Requires an Auth0 M2M application authorized for the Management API with
 * scopes: read:users, read:user_idp_tokens.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Auth0Identity {
  provider: string;
  user_id: string;
  connection: string;
  isSocial?: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface Auth0UserResponse {
  user_id: string;
  email?: string;
  identities: Auth0Identity[];
}

export interface FederatedGoogleTokens {
  refreshToken: string;
  googleEmail: string;
}

@Injectable()
export class Auth0ManagementService {
  private readonly logger = new Logger(Auth0ManagementService.name);
  private readonly domain: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly audience: string;

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(config: ConfigService) {
    this.domain = config.getOrThrow<string>('AUTH0_DOMAIN');
    this.clientId = config.get<string>('AUTH0_MGMT_CLIENT_ID') || undefined;
    this.clientSecret = config.get<string>('AUTH0_MGMT_CLIENT_SECRET') || undefined;
    const audOverride = config.get<string>('AUTH0_MGMT_AUDIENCE');
    this.audience = audOverride && audOverride.length > 0
      ? audOverride
      : `https://${this.domain}/api/v2/`;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Returns null if the user didn't sign in with Google via Auth0, or if
   * Auth0 doesn't have a Google refresh token on file for them.
   */
  async getFederatedGoogleTokens(userId: string): Promise<FederatedGoogleTokens | null> {
    if (!this.isConfigured()) {
      this.logger.debug('Auth0 Management API not configured; skipping federated lookup');
      return null;
    }

    const mgmtToken = await this.getManagementToken();
    const url = `https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });

    if (!res.ok) {
      this.logger.warn(`Auth0 GET /users/${userId} failed: ${res.status}`);
      return null;
    }

    const body = (await res.json()) as Auth0UserResponse;
    const googleIdentity = body.identities?.find(
      (i) => i.provider === 'google-oauth2',
    );

    if (!googleIdentity?.refresh_token) {
      return null;
    }

    return {
      refreshToken: googleIdentity.refresh_token,
      googleEmail: body.email ?? `${googleIdentity.user_id}@google`,
    };
  }

  private async getManagementToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.value;
    }

    const res = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.audience,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Auth0 M2M token request failed: ${res.status} ${text}`);
    }

    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: body.access_token,
      expiresAt: now + body.expires_in * 1000,
    };
    return body.access_token;
  }
}
