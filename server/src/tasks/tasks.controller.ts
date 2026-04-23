import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
  TasksService,
  type CreateTaskDto,
  type TaskDueDateFilter,
  type TaskPriorityFilter,
  type UpdateTaskDto,
  type TaskSortOption,
  type TaskStatusFilter,
} from './tasks.service';
import { SupabaseService } from '../supabase';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly supabase: SupabaseService,
  ) {}

  private async getUserRole(userId: string): Promise<string> {
    const { data } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    return data?.role ?? 'member';
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: TaskStatusFilter,
    @Query('priority') priority?: TaskPriorityFilter,
    @Query('dueDate') dueDate?: TaskDueDateFilter,
    @Query('sortBy') sortBy?: TaskSortOption,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.tasksService.listForUser(
      user.userId,
      role,
      search,
      status,
      priority,
      dueDate,
      sortBy,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(dto, user.userId);
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.tasksService.getById(id, user.userId, role);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.tasksService.update(id, dto, user.userId, role);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    await this.tasksService.delete(id, user.userId, role);
    return { deleted: true };
  }
}
