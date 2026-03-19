/**
 * auth/index.ts — barrel export for the auth module.
 *
 * Import from 'src/auth' instead of deep paths:
 *   import { JwtAuthGuard, CurrentUser, RequirePermissions } from './auth';
 */

export { AuthModule } from './auth.module';
export { JwtAuthGuard } from './jwt-auth.guard';
export { JwtStrategy } from './jwt.strategy';
export { PermissionsGuard } from './permissions.guard';
export { RequirePermissions, PERMISSIONS_KEY } from './permissions.decorator';
export { CurrentUser } from './current-user.decorator';
export type { Auth0JwtPayload, AuthenticatedUser } from './auth.interfaces';
