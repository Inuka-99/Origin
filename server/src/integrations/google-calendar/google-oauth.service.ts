/**
 * google-oauth.service.ts
 *
 * Handles the two OAuth flows we need:
 *  1. Standalone web flow (button on the Settings page).
 *     - start() builds the Google consent URL with a signed `state` JWT.
 *     - handleCallback() verifies state, exchanges the code for tokens,
 *       stores the refresh_token in Supabase.
 *
 *  2. Token refresh.
 *     - getAccessTokenForUser() returns a fresh access_token, preferring
 *       a federated (Auth0) refresh_token when available and falling back
 *       to the standalone connection.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { Auth0ManagementService } from './auth0-management.service';
import { GCalConnectionRepository } from './connection.repository';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
// openid + email let Google return the user's email on the tokeninfo endpoint
// so we can display "Connected as <email>" instead of "unknown@google".
const REQUIRED_SCOPES = [CALENDAR_SCOPE, 'openid', 'email'];
const STATE_TTL_SECONDS = 10 * 60;

interface StatePayload {
  sub: string; // Auth0 user id
  nonce: string;
}

interface UserTokens {
  accessToken: string;
  source: 'auth0_federated' | 'standalone_oauth';
  calendarId: string;
  googleEmail: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly stateSecret: string;
  private readonly defaultCalendarId: string;

  constructor(
    config: ConfigService,
    private readonly connections: GCalConnectionRepository,
    private readonly auth0Mgmt: Auth0ManagementService,
  ) {
    this.clientId = config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    this.redirectUri = config.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI');
    this.stateSecret = config.getOrThrow<string>('GCAL_OAUTH_STATE_SECRET');
    this.defaultCalendarId = config.get<string>('GOOGLE_CALENDAR_DEFAULT_ID', 'primary');
  }

  // ---------------------------------------------------------------------------
  // Standalone flow
  // ---------------------------------------------------------------------------

  buildAuthorizationUrl(userId: string): string {
    const state = jwt.sign(
      { sub: userId, nonce: this.randomNonce() } satisfies StatePayload,
      this.stateSecret,
      { expiresIn: STATE_TTL_SECONDS, algorithm: 'HS256' },
    );

    const oauth = this.newOAuth2Client();
    return oauth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: REQUIRED_SCOPES,
      state,
      include_granted_scopes: true,
    });
  }

  async handleCallback(code: string, state: string): Promise<{ userId: string }> {
    let payload: StatePayload;
    try {
      payload = jwt.verify(state, this.stateSecret, { algorithms: ['HS256'] }) as StatePayload;
    } catch (err) {
      this.logger.warn(`OAuth state verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const oauth = this.newOAuth2Client();
    const { tokens } = await oauth.getToken(code);

    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google did not return a refresh_token. Revoke app access at myaccount.google.com and try again.',
      );
    }

    oauth.setCredentials(tokens);
    const info = await oauth.getTokenInfo(tokens.access_token!);

    const email = info.email ?? 'unknown@google';
    const scopes = info.scopes ?? REQUIRED_SCOPES;

    if (!scopes.includes(CALENDAR_SCOPE)) {
      throw new BadRequestException(
        `Calendar scope not granted. Required: ${CALENDAR_SCOPE}`,
      );
    }

    await this.connections.upsert({
      userId: payload.sub,
      googleEmail: email,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes,
      source: 'standalone_oauth',
      calendarId: this.defaultCalendarId,
    });

    return { userId: payload.sub };
  }

  // ---------------------------------------------------------------------------
  // Access-token resolver
  // ---------------------------------------------------------------------------

  /**
   * Returns a valid access token for the given user, or null if the user has
   * no usable connection. Tries Auth0-federated first, then the standalone
   * DB row. Caches the access_token in the DB when we refresh.
   */
  async getAccessTokenForUser(userId: string): Promise<UserTokens | null> {
    // 1) Prefer federated tokens from Auth0 (no user action required).
    const federated = await this.auth0Mgmt.getFederatedGoogleTokens(userId);
    if (federated) {
      try {
        const { accessToken } = await this.refreshAccessToken(federated.refreshToken);
        return {
          accessToken,
          source: 'auth0_federated',
          googleEmail: federated.googleEmail,
          calendarId: this.defaultCalendarId,
        };
      } catch (err) {
        this.logger.warn(
          `Federated refresh failed for ${userId}: ${(err as Error).message}. Falling back to DB connection.`,
        );
      }
    }

    // 2) Fall back to the standalone connection row.
    const conn = await this.connections.findByUserId(userId);
    if (!conn || conn.needs_reconnect) return null;

    const now = Date.now();
    const expiresAt = conn.access_token_expires_at
      ? new Date(conn.access_token_expires_at).getTime()
      : 0;

    if (conn.access_token && expiresAt > now + 60_000) {
      return {
        accessToken: conn.access_token,
        source: conn.source,
        googleEmail: conn.google_email,
        calendarId: conn.calendar_id,
      };
    }

    try {
      const refreshed = await this.refreshAccessToken(conn.refresh_token);
      await this.connections.updateAccessToken(
        userId,
        refreshed.accessToken,
        refreshed.expiresAt,
      );
      return {
        accessToken: refreshed.accessToken,
        source: conn.source,
        googleEmail: conn.google_email,
        calendarId: conn.calendar_id,
      };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('invalid_grant')) {
        this.logger.warn(`invalid_grant for ${userId}; marking needs_reconnect`);
        await this.connections.markNeedsReconnect(userId);
      }
      return null;
    }
  }

  async revokeAndDisconnect(userId: string): Promise<void> {
    const conn = await this.connections.findByUserId(userId);
    if (conn) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: conn.refresh_token }),
        });
      } catch (err) {
        this.logger.warn(`Token revoke failed: ${(err as Error).message}`);
      }
      await this.connections.delete(userId);
    }
    await this.connections.deleteAllMappingsForUser(userId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private newOAuth2Client(): OAuth2Client {
    return new OAuth2Client({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
    });
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google token refresh failed: ${res.status} ${text}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    return {
      accessToken: body.access_token,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
    };
  }

  private randomNonce(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
