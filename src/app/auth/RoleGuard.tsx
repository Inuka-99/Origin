/**
 * RoleGuard.tsx
 *
 * Component that conditionally renders children based on the user's role.
 * Use this to show/hide UI elements based on RBAC.
 *
 * Usage:
 *   <RoleGuard requiredRole="admin">
 *     <AdminPanel />
 *   </RoleGuard>
 *
 *   <RoleGuard requiredRole="admin" fallback={<p>Access denied</p>}>
 *     <SecretStuff />
 *   </RoleGuard>
 */

import type { ReactNode } from 'react';
import { useUserRole } from './useUserRole';

interface RoleGuardProps {
  /** The role required to see the children */
  requiredRole: 'admin' | 'member';
  /** Content to render if the user doesn't have the required role */
  fallback?: ReactNode;
  /** Content to render while loading the role */
  loading?: ReactNode;
  /** The protected content */
  children: ReactNode;
}

export function RoleGuard({
  requiredRole,
  fallback = null,
  loading = null,
  children,
}: RoleGuardProps) {
  const { role, isLoading } = useUserRole();

  if (isLoading) return <>{loading}</>;

  // Admins can access everything; members can only access member-level content
  if (requiredRole === 'admin' && role !== 'admin') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
