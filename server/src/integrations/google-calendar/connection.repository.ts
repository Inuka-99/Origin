/**
 * connection.repository.ts
 *
 * Data-access layer for the google_calendar_connections and
 * google_calendar_task_events tables. Owns all encrypt/decrypt at the
 * boundary so higher-level services only see plaintext tokens.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase';
import { TokenCryptoService } from './token-crypto.service';

export interface GCalConnection {
  id: string;
  user_id: string;
  google_email: string;
  refresh_token: string; // plaintext (decrypted)
  access_token: string | null;
  access_token_expires_at: string | null;
  calendar_id: string;
  scopes: string[];
  source: 'auth0_federated' | 'standalone_oauth';
  needs_reconnect: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskEventMapping {
  task_id: string;
  user_id: string;
  google_event_id: string;
  calendar_id: string;
  etag: string | null;
  last_synced_at: string;
}

export interface UpsertConnectionInput {
  userId: string;
  googleEmail: string;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  calendarId?: string;
  scopes: string[];
  source: 'auth0_federated' | 'standalone_oauth';
}

@Injectable()
export class GCalConnectionRepository {
  private readonly logger = new Logger(GCalConnectionRepository.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly crypto: TokenCryptoService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findByUserId(userId: string): Promise<GCalConnection | null> {
    const { data, error } = await this.client
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.warn(`findByUserId failed: ${error.message}`);
      return null;
    }
    if (!data) return null;

    return this.decryptRow(data);
  }

  async upsert(input: UpsertConnectionInput): Promise<GCalConnection> {
    const row = {
      user_id: input.userId,
      google_email: input.googleEmail,
      refresh_token: this.crypto.encrypt(input.refreshToken),
      access_token: input.accessToken ? this.crypto.encrypt(input.accessToken) : null,
      access_token_expires_at: input.accessTokenExpiresAt?.toISOString() ?? null,
      calendar_id: input.calendarId ?? 'primary',
      scopes: input.scopes,
      source: input.source,
      needs_reconnect: false,
    };

    const { data, error } = await this.client
      .from('google_calendar_connections')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      throw new Error(`upsert google_calendar_connection failed: ${error.message}`);
    }
    return this.decryptRow(data);
  }

  async updateAccessToken(
    userId: string,
    accessToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_connections')
      .update({
        access_token: this.crypto.encrypt(accessToken),
        access_token_expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      this.logger.warn(`updateAccessToken failed: ${error.message}`);
    }
  }

  async updateCalendarId(userId: string, calendarId: string): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_connections')
      .update({ calendar_id: calendarId })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`updateCalendarId failed: ${error.message}`);
    }
  }

  async markNeedsReconnect(userId: string): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_connections')
      .update({ needs_reconnect: true })
      .eq('user_id', userId);

    if (error) {
      this.logger.warn(`markNeedsReconnect failed: ${error.message}`);
    }
  }

  async delete(userId: string): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`delete connection failed: ${error.message}`);
    }
  }

  // --- Task ↔ event mapping ---

  async findMapping(taskId: string, userId: string): Promise<TaskEventMapping | null> {
    const { data, error } = await this.client
      .from('google_calendar_task_events')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.warn(`findMapping failed: ${error.message}`);
      return null;
    }
    return (data as TaskEventMapping) ?? null;
  }

  async upsertMapping(input: TaskEventMapping): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_task_events')
      .upsert(input, { onConflict: 'task_id,user_id' });

    if (error) {
      throw new Error(`upsertMapping failed: ${error.message}`);
    }
  }

  async deleteMapping(taskId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_task_events')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (error) {
      this.logger.warn(`deleteMapping failed: ${error.message}`);
    }
  }

  async deleteAllMappingsForUser(userId: string): Promise<void> {
    const { error } = await this.client
      .from('google_calendar_task_events')
      .delete()
      .eq('user_id', userId);

    if (error) {
      this.logger.warn(`deleteAllMappingsForUser failed: ${error.message}`);
    }
  }

  private decryptRow(row: any): GCalConnection {
    return {
      ...row,
      refresh_token: this.crypto.decrypt(row.refresh_token),
      access_token: row.access_token ? this.crypto.decrypt(row.access_token) : null,
    };
  }
}
