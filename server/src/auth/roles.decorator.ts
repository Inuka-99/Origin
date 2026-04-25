/**
 * roles.decorator.ts
 *
 * Decorator that declares which Supabase-stored roles a route requires.
 * Works in tandem with RolesGuard.
 *
 * Usage:
 *   @Roles('admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Delete('projects/:id')
 *   deleteProject() { ... }
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
