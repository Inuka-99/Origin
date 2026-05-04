/**
 * projects.controller.ts
 *
 * REST endpoints for project CRUD with role-based access control.
 *
 * GET    /projects              — List projects (members see own, admins see all)
 * POST   /projects              — Create a project (any authenticated user)
 * GET    /projects/:id          — Get project details
 * PATCH  /projects/:id          — Update project (project admin or global admin)
 * DELETE /projects/:id          — Delete project (project admin or global admin)
 * GET    /projects/:id/members  — List project members
 * POST   /projects/:id/members  — Add a member (project admin or global admin)
 * DELETE /projects/:id/members/:userId — Remove a member
 */

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
  ProjectsService,
  type CreateProjectDto,
  type UpdateProjectDto,
} from './projects.service';
import { SupabaseService } from '../supabase';
import { UserRoleCache } from '../users';

@Controller('projects')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly supabase: SupabaseService,
    private readonly roleCache: UserRoleCache,
  ) {}

  /**
   * Helper: get the user's global role from their Supabase profile,
   * cached for the duration of the role TTL to avoid an extra DB
   * round-trip on every authenticated request.
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
    @Query('q') search?: string,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.projectsService.listForUser(user.userId, role, page, limit, search);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(dto, user.userId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.projectsService.update(id, dto, user.userId, role);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    await this.projectsService.delete(id, user.userId, role);
    return { deleted: true };
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const role = await this.getUserRole(user.userId);
    return this.projectsService.listMembers(id, user.userId, role);
  }

  @Get(':id/member-candidates')
  async listMemberCandidates(
    @Param('id') id: string,
    @Query('q') query: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.projectsService.searchMemberCandidates(id, query, user.userId, role);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: { user_id: string; role?: 'admin' | 'member' },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    return this.projectsService.addMember(id, body.user_id, body.role, user.userId, role);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.getUserRole(user.userId);
    await this.projectsService.removeMember(id, userId, user.userId, role);
    return { removed: true };
  }
}
