/**
 * users.controller.ts
 *
 * Endpoints for user profile management and role administration.
 *
 * GET  /users/me        — Get current user's profile (syncs from Auth0 if first time)
 * GET  /users           — List all users (admin only)
 * GET  /users/:id       — Get a specific user profile
 * PATCH /users/:id/role — Update a user's role (admin only)
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserSyncInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's profile from Supabase.
   * Creates the profile if it doesn't exist yet (first login).
   */
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOrCreateProfile(user.userId);
  }

  /**
   * GET /users
   * Returns all user profiles. Admin only.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async listUsers() {
    return this.usersService.listAll();
  }

  /**
   * GET /users/:id
   * Returns a specific user's profile.
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  /**
   * PATCH /users/:id/role
   * Updates a user's role. Admin only.
   * Body: { "role": "admin" | "member" }
   */
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateRole(id, role);
  }
}
