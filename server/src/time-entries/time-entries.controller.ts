import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import { SupabaseService } from '../supabase';
import { UserRoleCache } from '../users';
import {
  TimeEntriesService,
  type CreateTimeEntryDto,
  type UpdateTimeEntryDto,
} from './time-entries.service';

@Controller('tasks/:taskId/time-entries')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class TimeEntriesController {
  constructor(
    private readonly timeEntriesService: TimeEntriesService,
    private readonly supabase: SupabaseService,
    private readonly roleCache: UserRoleCache,
  ) {}

  private async getUserRole(userId: string): Promise<string> {
    const cached = this.roleCache.get(userId);
    if (cached) return cached;

    const { data } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    const role = data?.role ?? 'member';
    this.roleCache.set(userId, role);
    return role;
  }

  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.timeEntriesService.listForTask(taskId, user.userId, role);
  }

  @Post()
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.timeEntriesService.createForTask(taskId, dto, user.userId, role);
  }

  @Patch(':entryId')
  async update(
    @Param('taskId') taskId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.timeEntriesService.updateForTask(taskId, entryId, dto, user.userId, role);
  }
}
