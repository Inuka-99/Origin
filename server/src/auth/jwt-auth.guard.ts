/**
 * jwt-auth.guard.ts
 *
 * Standard NestJS guard that triggers the JWT passport strategy.
 *
 * Usage on a controller or route:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
