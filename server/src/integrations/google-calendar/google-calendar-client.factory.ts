/**
 * google-calendar-client.factory.ts
 *
 * Builds a per-request googleapis.calendar client already populated with
 * the user's current access token. Centralizes this so every caller goes
 * through the same OAuth-resolution path.
 */

import { Injectable } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { GoogleOAuthService } from './google-oauth.service';

export interface ResolvedCalendarClient {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  googleEmail: string;
  source: 'auth0_federated' | 'standalone_oauth';
}

@Injectable()
export class GoogleCalendarClientFactory {
  constructor(private readonly oauth: GoogleOAuthService) {}

  async forUser(userId: string): Promise<ResolvedCalendarClient | null> {
    const tokens = await this.oauth.getAccessTokenForUser(userId);
    if (!tokens) return null;

    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: tokens.accessToken });

    return {
      calendar: google.calendar({ version: 'v3', auth: authClient }),
      calendarId: tokens.calendarId,
      googleEmail: tokens.googleEmail,
      source: tokens.source,
    };
  }
}
