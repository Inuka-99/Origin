/**
 * google-calendar.service.ts
 *
 * High-level sync operations. Controllers and the TasksService hook into
 * this — they never touch googleapis or OAuth directly.
 *
 * Sync rules:
 *  - No due_date OR status='Done'  → unsync (delete event + mapping).
 *  - Otherwise                      → upsert event.
 *  - All operations are idempotent via the google_calendar_task_events table.
 *  - If the user has no connection, every call is a silent no-op.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { calendar_v3 } from 'googleapis';
import { GCalConnectionRepository } from './connection.repository';
import { GoogleCalendarClientFactory } from './google-calendar-client.factory';
import type { BackfillResponseDto, SyncTaskResponseDto, CalendarListItemDto } from './dto/sync-status.dto';

export interface TaskForSync {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  project_id: string | null;
}

const DONE_STATUSES = new Set(['done', 'Done']);
const BACKFILL_CAP = 500;

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly frontendUrl: string;

  constructor(
    config: ConfigService,
    private readonly clientFactory: GoogleCalendarClientFactory,
    private readonly connections: GCalConnectionRepository,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  async getStatus(userId: string): Promise<{
    connected: boolean;
    source?: 'auth0_federated' | 'standalone_oauth';
    googleEmail?: string;
    calendarId?: string;
    needsReconnect?: boolean;
  }> {
    const conn = await this.connections.findByUserId(userId);
    if (conn) {
      // Existing connections may carry a "unknown@google" placeholder
      // from the older OAuth flow that didn't request the email scope.
      // Heal that lazily: ask Google's userinfo endpoint with a fresh
      // access token and persist the real address. We swallow failures
      // because this is a UX nicety — never block the status response.
      let googleEmail = conn.google_email;
      if (this.looksLikePlaceholderEmail(googleEmail)) {
        const real = await this.refreshConnectedEmail(userId);
        if (real) googleEmail = real;
      }

      return {
        connected: !conn.needs_reconnect,
        source: conn.source,
        googleEmail,
        calendarId: conn.calendar_id,
        needsReconnect: conn.needs_reconnect,
      };
    }

    // No standalone row — check if Auth0 can give us federated tokens.
    const client = await this.clientFactory.forUser(userId);
    if (!client) return { connected: false };
    return {
      connected: true,
      source: client.source,
      googleEmail: client.googleEmail,
      calendarId: client.calendarId,
    };
  }

  async listCalendars(userId: string): Promise<CalendarListItemDto[]> {
    const client = await this.clientFactory.forUser(userId);
    if (!client) return [];

    try {
      const res = await client.calendar.calendarList.list({ maxResults: 100 });
      return (res.data.items ?? []).map((c) => ({
        id: c.id!,
        summary: c.summary ?? c.id!,
        primary: Boolean(c.primary),
        accessRole: c.accessRole ?? undefined,
        backgroundColor: c.backgroundColor ?? undefined,
      }));
    } catch (err: any) {
      // calendarList.list requires `calendar.readonly` (or broader) on
      // top of `calendar.events`. Older grants connected before that
      // scope was added will get a 403 here. We surface that as an
      // empty list rather than a 500 — the UI defaults to "primary"
      // when the list is empty, so the integration still works for
      // sync; it just can't enumerate other calendars until reconnect.
      const status = err?.code ?? err?.response?.status;
      // 403 here means the connection was made before we requested
      // calendar.readonly. That's expected — log at debug level so
      // we don't flood the warning stream. Anything else stays a
      // warning because it's actually unusual.
      if (status === 403) {
        this.logger.debug(
          `calendarList.list 403 for user ${userId} — needs reconnect for calendar.readonly scope`,
        );
      } else {
        this.logger.warn(
          `calendarList.list failed (status=${status}) for user ${userId}: ${(err as Error).message}`,
        );
      }
      return [];
    }
  }

  async setCalendarId(userId: string, calendarId: string): Promise<void> {
    await this.connections.updateCalendarId(userId, calendarId);
  }

  async syncTask(task: TaskForSync, userId: string): Promise<SyncTaskResponseDto> {
    const client = await this.clientFactory.forUser(userId);
    if (!client) {
      return { taskId: task.id, status: 'skipped', reason: 'no_connection' };
    }

    const shouldUnsync = !task.due_date || DONE_STATUSES.has(task.status);
    if (shouldUnsync) {
      await this.removeMappedEvent(client.calendar, task.id, userId);
      return { taskId: task.id, status: 'deleted', reason: shouldUnsync ? 'no_due_date_or_done' : undefined };
    }

    const mapping = await this.connections.findMapping(task.id, userId);
    const eventBody = this.buildEventBody(task, userId);

    if (mapping) {
      try {
        const patched = await client.calendar.events.patch({
          calendarId: mapping.calendar_id,
          eventId: mapping.google_event_id,
          requestBody: eventBody,
        });
        await this.connections.upsertMapping({
          task_id: task.id,
          user_id: userId,
          google_event_id: patched.data.id!,
          calendar_id: mapping.calendar_id,
          etag: patched.data.etag ?? null,
          last_synced_at: new Date().toISOString(),
        });
        return { taskId: task.id, status: 'updated', eventId: patched.data.id ?? undefined };
      } catch (err: any) {
        if (err?.code === 404 || err?.response?.status === 404) {
          this.logger.log(`Event ${mapping.google_event_id} gone; reinserting for task ${task.id}`);
          return this.insertFresh(client.calendar, client.calendarId, task, userId, eventBody);
        }
        throw err;
      }
    }

    return this.insertFresh(client.calendar, client.calendarId, task, userId, eventBody);
  }

  async unsyncTask(taskId: string, userId: string): Promise<SyncTaskResponseDto> {
    const client = await this.clientFactory.forUser(userId);
    if (!client) {
      await this.connections.deleteMapping(taskId, userId);
      return { taskId, status: 'skipped', reason: 'no_connection' };
    }
    await this.removeMappedEvent(client.calendar, taskId, userId);
    return { taskId, status: 'deleted' };
  }

  async backfill(
    tasks: TaskForSync[],
    userId: string,
  ): Promise<BackfillResponseDto> {
    const capped = tasks.slice(0, BACKFILL_CAP);
    const result: BackfillResponseDto = {
      inspected: capped.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    for (const task of capped) {
      try {
        const res = await this.syncTask(task, userId);
        if (res.status === 'created') result.created++;
        else if (res.status === 'updated') result.updated++;
        else result.skipped++;
      } catch (err) {
        this.logger.warn(
          `Backfill failed for task ${task.id}: ${(err as Error).message}`,
        );
        result.failed++;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * `unknown@google` was the old fallback string when the OAuth flow
   * didn't request the email scope. Anything that looks like a
   * placeholder triggers a userinfo refresh.
   */
  private looksLikePlaceholderEmail(email: string | null | undefined): boolean {
    if (!email) return true;
    if (email === 'unknown@google') return true;
    // Auth0 management fallback writes "<google-user-id>@google" — those
    // also aren't real addresses and should be refreshed.
    return email.endsWith('@google');
  }

  /**
   * Hit Google's userinfo endpoint with a fresh access token, persist
   * the resulting email on the connection row, and return it. Returns
   * null on any failure so callers can fall back gracefully.
   */
  private async refreshConnectedEmail(userId: string): Promise<string | null> {
    const client = await this.clientFactory.forUser(userId);
    if (!client) return null;

    // The googleapis client doesn't expose userinfo directly, but the
    // OAuth client it was built from does have the access token. We
    // use a plain fetch to avoid pulling in another googleapis surface.
    try {
      const credentials = (client.calendar.context._options.auth as any)?.credentials;
      const accessToken: string | undefined = credentials?.access_token;
      if (!accessToken) return null;

      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        // 401 means the access token doesn't carry the email scope —
        // expected for connections made before we requested it.
        // Anything else stays a warning.
        if (res.status === 401) {
          this.logger.debug(
            `userinfo 401 for user ${userId} — needs reconnect for email scope`,
          );
        } else {
          this.logger.warn(
            `userinfo refresh failed (${res.status}) for user ${userId}`,
          );
        }
        return null;
      }
      const body = (await res.json()) as { email?: string };
      const email = body.email;
      if (!email) return null;

      await this.connections.updateGoogleEmail(userId, email);
      return email;
    } catch (err) {
      this.logger.warn(
        `userinfo refresh threw for user ${userId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async insertFresh(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    task: TaskForSync,
    userId: string,
    body: calendar_v3.Schema$Event,
  ): Promise<SyncTaskResponseDto> {
    const inserted = await calendar.events.insert({
      calendarId,
      requestBody: body,
    });
    await this.connections.upsertMapping({
      task_id: task.id,
      user_id: userId,
      google_event_id: inserted.data.id!,
      calendar_id: calendarId,
      etag: inserted.data.etag ?? null,
      last_synced_at: new Date().toISOString(),
    });
    return { taskId: task.id, status: 'created', eventId: inserted.data.id ?? undefined };
  }

  private async removeMappedEvent(
    calendar: calendar_v3.Calendar,
    taskId: string,
    userId: string,
  ): Promise<void> {
    const mapping = await this.connections.findMapping(taskId, userId);
    if (!mapping) return;

    try {
      await calendar.events.delete({
        calendarId: mapping.calendar_id,
        eventId: mapping.google_event_id,
      });
    } catch (err: any) {
      const status = err?.code ?? err?.response?.status;
      if (status !== 404 && status !== 410) {
        this.logger.warn(
          `Delete event ${mapping.google_event_id} failed (${status}): ${(err as Error).message}`,
        );
      }
    }
    await this.connections.deleteMapping(taskId, userId);
  }

  private buildEventBody(task: TaskForSync, userId: string): calendar_v3.Schema$Event {
    const isAllDay = this.looksLikeDateOnly(task.due_date!);
    const dateStr = task.due_date!;

    const start: calendar_v3.Schema$EventDateTime = isAllDay
      ? { date: dateStr.slice(0, 10) }
      : { dateTime: new Date(dateStr).toISOString() };

    const end: calendar_v3.Schema$EventDateTime = isAllDay
      ? { date: this.addOneDay(dateStr.slice(0, 10)) }
      : { dateTime: new Date(new Date(dateStr).getTime() + 30 * 60 * 1000).toISOString() };

    return {
      summary: task.title,
      description: [
        `Origin task: ${task.id}`,
        task.description ?? '',
        `${this.frontendUrl}/tasks/${task.id}`,
      ]
        .filter(Boolean)
        .join('\n'),
      start,
      end,
      extendedProperties: {
        private: {
          origin_task_id: task.id,
          origin_user_id: userId,
        },
      },
      reminders: { useDefault: true },
    };
  }

  private looksLikeDateOnly(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  }

  private addOneDay(yyyyMmDd: string): string {
    const d = new Date(`${yyyyMmDd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
}
