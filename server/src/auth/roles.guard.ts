/**
 * roles.guard.ts
 *
 * Guard that checks whether the authenticated user has the required role
 * stored in the Supabase `profiles` table.
 *
 * Must be used AFTER JwtAuthGuard so that request.user is populated:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * If no @Roles() decorator is present on the route, this guard passes through.
 */

import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedUser } from './auth.interfaces';
import { SupabaseService } from '../supabase';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles declared → allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // Look up the user's role from the Supabase profiles table
    const { data: profile, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', user.userId)
      .single();

    if (error || !profile) {
      throw new ForbiddenException('User profile not found');
    }

    // Attach role to request for downstream use
    request.userRole = profile.role;

    // Check if the user's role matches any of the required roles
    if (!requiredRoles.includes(profile.role)) {
      throw new ForbiddenException(
        `Role '${profile.role}' is not authorized. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
