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
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  CurrentUser,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import { TasksService, type CreateTaskDto, type UpdateTaskDto } from './tasks.service';
import { AttachmentsService } from './attachments.service';
import { SupabaseService } from '../supabase';
import { UserRoleCache } from '../users';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly attachmentsService: AttachmentsService,
    private readonly supabase: SupabaseService,
    private readonly roleCache: UserRoleCache,
  ) {}

  /**
   * Resolve the user's global role, hitting the cache first.
   *
   * Before this cache, every request to /tasks made an extra
   * Supabase round-trip just to read the role. The cache cuts
   * that out for the common case (role unchanged) while
   * UsersService.updateRole() handles invalidation.
   */
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
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.tasksService.listForUser(user.userId, role, page, limit);
  }

  @Get('project/:projectId')
  async listByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.tasksService.listByProject(projectId, user.userId, role, page, limit);
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

  /**
   * Upload a file attachment to a task
   * POST /tasks/:id/attachments
   * Body: multipart/form-data with 'file' field
   */
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') taskId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: AuthenticatedUser,
    @Query('activityLogId') activityLogId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.attachmentsService.uploadAttachment(
      file,
      taskId,
      user.userId,
      activityLogId,
    );
  }

  /**
   * Get all attachments for a task
   * GET /tasks/:id/attachments
   */
  @Get(':id/attachments')
  async getTaskAttachments(@Param('id') taskId: string) {
    return this.attachmentsService.getTaskAttachments(taskId);
  }

  /**
   * Get download URL for an attachment
   * GET /tasks/attachments/:id/download
   */
  @Get('attachments/:id/download')
  async getDownloadUrl(
    @Param('id') attachmentId: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.attachmentsService.getDownloadUrl(
      attachmentId,
      expiresInSeconds,
    );
    return { url };
  }

  /**
   * Delete an attachment
   * DELETE /tasks/attachments/:id
   */
  @Delete('attachments/:id')
  async deleteAttachment(
    @Param('id') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    await this.attachmentsService.deleteAttachment(attachmentId, user.userId, role);
    return { deleted: true };
  }
}
