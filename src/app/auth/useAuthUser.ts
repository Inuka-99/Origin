/**
 * useAuthUser.ts
 *
 * A convenience hook that returns the current Auth0 user in a typed shape,
 * plus authentication state booleans.
 *
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useAuthUser();
 */

import { useAuth0 } from '@auth0/auth0-react';
import type { AuthUser } from './auth.interfaces';

export interface UseAuthUserReturn {
  /** Typed Auth0 user profile (null when not authenticated) */
  user: AuthUser | null;
  /** True once Auth0 confirms the user is logged in */
  isAuthenticated: boolean;
  /** True while Auth0 is checking session / loading */
  isLoading: boolean;
}

export function useAuthUser(): UseAuthUserReturn {
  const { user, isAuthenticated, isLoading } = useAuth0();

  const typedUser: AuthUser | null =
    isAuthenticated && user
      ? {
          sub: user.sub ?? '',
          name: user.name ?? '',
          email: user.email ?? '',
          email_verified: user.email_verified ?? false,
          picture: user.picture ?? '',
          updated_at: user.updated_at ?? '',
        }
      : null;

  return { user: typedUser, isAuthenticated, isLoading };
}
