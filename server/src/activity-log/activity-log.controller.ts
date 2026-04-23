/**
 * activity-log.controller.ts
 *
 * REST endpoints for querying activity logs.
 *
 * GET  /activity-logs            — List activity logs (filterable, paginated)
 * GET  /activity-logs/recent     — Get recent activity (dashboard widget)
 * GET  /activity-logs/entity/:type/:id — Get activity for a specific entity
 * POST /activity-logs            — Manually log an activity (admin or internal)
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  CurrentUser,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import {
  ActivityLogService,
  type CreateActivityLogDto,
  type ActivityLogQuery,
} from './activity-log.service';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * GET /activity-logs
   * Query activity logs with optional filters and pagination.
   *
   * Query params:
   *  - project_id: filter by project
   *  - user_id: filter by user
   *  - entity_type: filter by entity type (task, project, member)
   *  - action: filter by action (task_created, status_changed, etc.)
   *  - page: page number (default 1)
   *  - limit: items per page (default 20, max 100)
   */
  @Get()
  async list(
    @Query('project_id') projectId?: string,
    @Query('user_id') userId?: string,
    @Query('entity_type') entityType?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: ActivityLogQuery = {
      project_id: projectId,
      user_id: userId,
      entity_type: entityType,
      action: action,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.activityLogService.list(query);
  }

  /**
   * GET /activity-logs/recent
   * Get the most recent activity entries (for dashboard widget).
   * Optional query param: count (default 10)
   */
  @Get('recent')
  async getRecent(@Query('count') count?: string) {
    const n = count ? Math.min(50, parseInt(count, 10)) : 10;
    return this.activityLogService.getRecent(n);
  }

  /**
   * GET /activity-logs/entity/:type/:id
   * Get all activity for a specific entity (e.g. all changes to a task).
   */
  @Get('entity/:type/:id')
  async getByEntity(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
  ) {
    return this.activityLogService.getByEntity(entityType, entityId);
  }

  /**
   * POST /activity-logs
   * Manually create an activity log entry.
   * Primarily for internal use or admin actions.
   * The user_id is auto-set to the authenticated user.
   */
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      action: string;
      entity_type: string;
      entity_id: string;
      description: string;
      metadata?: Record<string, unknown>;
      project_id?: string;
    },
  ) {
    const dto: CreateActivityLogDto = {
      user_id: user.userId,
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      description: body.description,
      metadata: body.metadata,
      project_id: body.project_id,
    };

    return this.activityLogService.log(dto);
  }
}
