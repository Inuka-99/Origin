/**
 * ProtectedRoute.tsx
 *
 * A layout-level route guard. Any child routes rendered inside this
 * component require the user to be authenticated.
 *
 * How it works:
 *  1. While Auth0 is loading → show AuthLoading spinner
 *  2. If not authenticated → redirect straight to Auth0 login
 *  3. If authenticated → render child routes via <Outlet />
 *
 * Used as a layout route in routes.ts so all protected pages are wrapped
 * without adding a guard to every individual route.
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthLoading } from './AuthLoading';
import { useAuthUser } from './useAuthUser';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthUser();
  const { loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return <AuthLoading />;
  }

  return <Outlet />;
}
