/**
 * permissions.guard.ts
 *
 * Guard that checks whether the authenticated user's token contains
 * ALL the permissions declared by @RequirePermissions().
 *
 * Must be used AFTER JwtAuthGuard so that request.user is populated:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *
 * If no @RequirePermissions() decorator is present on the route,
 * this guard passes through (allows access).
 */

import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from './auth.interfaces';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions declared → allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user as AuthenticatedUser;

    // Check that the user's token contains every required permission
    return requiredPermissions.every((perm) =>
      user.permissions.includes(perm),
    );
  }
}
