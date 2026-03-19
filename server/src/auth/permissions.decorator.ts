/**
 * permissions.decorator.ts
 *
 * Decorator that declares which Auth0 permissions a route requires.
 * Works in tandem with PermissionsGuard.
 *
 * Usage:
 *   @RequirePermissions('read:projects', 'write:projects')
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @Post('projects')
 *   create() { ... }
 *
 * Setup in Auth0:
 *  1. Go to APIs → Your API → Permissions and define permissions.
 *  2. Go to APIs → Your API → Settings → Enable "Add Permissions in the Access Token".
 *  3. Assign permissions to roles, and roles to users.
 */

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
