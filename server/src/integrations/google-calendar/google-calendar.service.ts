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
      return {
        connected: !conn.needs_reconnect,
        source: conn.source,
        googleEmail: conn.google_email,
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

    const res = await client.calendar.calendarList.list({ maxResults: 100 });
    return (res.data.items ?? []).map((c: calendar_v3.Schema$CalendarListEntry) => ({
      id: c.id!,
      summary: c.summary ?? c.id!,
      primary: Boolean(c.primary),
      accessRole: c.accessRole ?? undefined,
      backgroundColor: c.backgroundColor ?? undefined,
    }));
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
