/**
 * app.controller.ts
 *
 * Example controller demonstrating:
 *  - A public health-check endpoint
 *  - A protected endpoint (requires valid Auth0 JWT)
 *  - A permissions-protected endpoint (requires specific Auth0 permission)
 *
 * Use these as templates for your own controllers.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  CurrentUser,
  type AuthenticatedUser,
} from './auth';

@Controller()
export class AppController {
  /**
   * GET /health
   * Public — no auth required. Use for uptime monitoring.
   */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * GET /me
   * Protected — requires a valid Auth0 JWT.
   * Returns the authenticated user's ID and permissions from the token.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.userId,
      permissions: user.permissions,
    };
  }

  /**
   * GET /admin/stats
   * Protected + RBAC — requires both a valid JWT AND the 'read:admin-stats'
   * permission in the token.
   *
   * To make this work:
   *  1. In Auth0 Dashboard → APIs → Your API → Permissions, add 'read:admin-stats'
   *  2. Enable "Add Permissions in the Access Token" in API settings
   *  3. Create a role with this permission and assign it to a user
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:admin-stats')
  @Get('admin/stats')
  getAdminStats(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: `Admin stats for user ${user.userId}`,
      totalUsers: 42,
      activeProjects: 7,
    };
  }
}
