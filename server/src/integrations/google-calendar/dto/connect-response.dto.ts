export class OAuthStartResponseDto {
  url!: string;
}

export class ConnectionStatusDto {
  connected!: boolean;
  source?: 'auth0_federated' | 'standalone_oauth';
  googleEmail?: string;
  calendarId?: string;
  needsReconnect?: boolean;
}
