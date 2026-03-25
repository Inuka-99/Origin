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
export { Roles, ROLES_KEY } from './roles.decorator';
export { RolesGuard } from './roles.guard';
export { UserSyncInterceptor } from './user-sync.interceptor';
export type { Auth0JwtPayload, AuthenticatedUser } from './auth.interfaces';
