/**
 * current-user.decorator.ts
 *
 * Custom parameter decorator that extracts the authenticated user
 * from the request object (set by JwtAuthGuard + JwtStrategy).
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: AuthenticatedUser) {
 *     return user;
 *   }
 */

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
