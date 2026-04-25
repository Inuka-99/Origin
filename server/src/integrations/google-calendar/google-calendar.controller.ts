/**
 * google-calendar.controller.ts
 *
 * HTTP surface for the Google Calendar integration. The OAuth callback is
 * intentionally NOT behind JwtAuthGuard — Google's browser redirect won't
 * carry an Auth0 JWT. User identity is instead carried in the signed state
 * JWT that we created in /oauth/start.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../../auth';
import { TasksService } from '../../tasks/tasks.service';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleCalendarService, type TaskForSync } from './google-calendar.service';
import {
  ConnectionStatusDto,
  OAuthStartResponseDto,
} from './dto/connect-response.dto';
import {
  BackfillResponseDto,
  CalendarListItemDto,
  SyncTaskResponseDto,
} from './dto/sync-status.dto';

const BACKFILL_COOLDOWN_MS = 5 * 60 * 1000;

@Controller('api/integrations/google')
export class GoogleCalendarController {
  private readonly backfillLastRun = new Map<string, number>();
  private readonly frontendUrl: string;

  constructor(
    config: ConfigService,
    private readonly oauth: GoogleOAuthService,
    private readonly calendar: GoogleCalendarService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasks: TasksService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  // ---------------------------------------------------------------------------
  // OAuth (standalone flow)
  // ---------------------------------------------------------------------------

  @Post('oauth/start')
  @UseGuards(JwtAuthGuard)
  startOAuth(@CurrentUser() user: AuthenticatedUser): OAuthStartResponseDto {
    return { url: this.oauth.buildAuthorizationUrl(user.userId) };
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      return res.redirect(
        `${this.frontendUrl}/settings?google=error&reason=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }

    try {
      await this.oauth.handleCallback(code, state);
      return res.redirect(`${this.frontendUrl}/settings?google=connected`);
    } catch (err) {
      const reason = (err as Error).message;
      return res.redirect(
        `${this.frontendUrl}/settings?google=error&reason=${encodeURIComponent(reason)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Status, calendar management
  // ---------------------------------------------------------------------------

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: AuthenticatedUser): Promise<ConnectionStatusDto> {
    return this.calendar.getStatus(user.userId);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async disconnect(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.oauth.revokeAndDisconnect(user.userId);
  }

  @Get('calendars')
  @UseGuards(JwtAuthGuard)
  async listCalendars(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CalendarListItemDto[]> {
    return this.calendar.listCalendars(user.userId);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async patchSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { calendarId?: string },
  ): Promise<{ ok: true }> {
    if (!body.calendarId) {
      throw new BadRequestException('calendarId is required');
    }
    await this.calendar.setCalendarId(user.userId, body.calendarId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Manual sync triggers
  // ---------------------------------------------------------------------------

  @Post('sync/task/:taskId')
  @UseGuards(JwtAuthGuard)
  async syncOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
  ): Promise<SyncTaskResponseDto> {
    const task = await this.tasks.getById(taskId, user.userId, this.roleFor(user));
    return this.calendar.syncTask(toTaskForSync(task), user.userId);
  }

  @Delete('sync/task/:taskId')
  @UseGuards(JwtAuthGuard)
  async unsyncOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
  ): Promise<SyncTaskResponseDto> {
    return this.calendar.unsyncTask(taskId, user.userId);
  }

  @Post('sync/backfill')
  @UseGuards(JwtAuthGuard)
  async backfill(@CurrentUser() user: AuthenticatedUser): Promise<BackfillResponseDto> {
    const last = this.backfillLastRun.get(user.userId) ?? 0;
    const now = Date.now();
    if (now - last < BACKFILL_COOLDOWN_MS) {
      throw new BadRequestException(
        `Backfill is rate-limited — try again in ${Math.ceil(
          (BACKFILL_COOLDOWN_MS - (now - last)) / 1000,
        )}s`,
      );
    }
    this.backfillLastRun.set(user.userId, now);

    const allTasks = await this.tasks.listForUser(user.userId, this.roleFor(user));
    const candidates = allTasks
      .filter((t) => t.due_date && !['done', 'Done'].includes(t.status))
      .map(toTaskForSync);

    return this.calendar.backfill(candidates, user.userId);
  }

  private roleFor(user: AuthenticatedUser): string {
    return user.permissions.includes('admin') ? 'admin' : 'member';
  }
}

function toTaskForSync(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  project_id: string | null;
}): TaskForSync {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    due_date: t.due_date,
    project_id: t.project_id,
  };
}
