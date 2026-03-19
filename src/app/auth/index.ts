/**
 * auth/index.ts — barrel export for the auth module.
 *
 * Import everything from '@/app/auth' instead of deep paths:
 *   import { useAuthUser, ProtectedRoute, LogoutButton } from '@/app/auth';
 */

export { AuthProvider } from './AuthProvider';
export { ProtectedRoute } from './ProtectedRoute';
export { AuthLoading } from './AuthLoading';
export { Unauthorized } from './Unauthorized';
export { LoginButton } from './LoginButton';
export { LogoutButton } from './LogoutButton';
export { useAuthUser } from './useAuthUser';
export type { AuthUser, Auth0Config } from './auth.interfaces';
export { getAuth0Config } from './auth.interfaces';
