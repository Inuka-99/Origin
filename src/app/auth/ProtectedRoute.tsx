/**
 * ProtectedRoute.tsx
 *
 * A layout-level route guard. Any child routes rendered inside this
 * component require the user to be authenticated.
 *
 * How it works:
 *  1. While Auth0 is loading → show AuthLoading spinner
 *  2. If not authenticated → show Unauthorized page
 *  3. If authenticated → render child routes via <Outlet />
 *
 * Used as a layout route in routes.ts so all protected pages are wrapped
 * without adding a guard to every individual route.
 */

import { Outlet } from 'react-router';
import { AuthLoading } from './AuthLoading';
import { Unauthorized } from './Unauthorized';
import { useAuthUser } from './useAuthUser';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthUser();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Unauthorized />;
  }

  return <Outlet />;
}
