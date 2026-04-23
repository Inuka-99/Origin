/**
 * useUserRole.ts
 *
 * Hook that fetches the current user's role from the backend.
 * Returns the role ('admin' | 'member'), loading state, and helper booleans.
 *
 * Usage:
 *   const { role, isAdmin, isLoading } = useUserRole();
 */

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getAuth0Config } from './auth.interfaces';

export interface UseUserRoleReturn {
  /** The user's role from Supabase ('admin' | 'member') */
  role: 'admin' | 'member' | null;
  /** Convenience boolean: true if user is an admin */
  isAdmin: boolean;
  /** True while fetching the role from the backend */
  isLoading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Re-fetch the role (e.g. after an admin changes it) */
  refetch: () => void;
}

export function useUserRole(): UseUserRoleReturn {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [role, setRole] = useState<'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchRole = async () => {
      try {
        setIsLoading(true);
        const { apiUrl, audience } = getAuth0Config();
        const token = await getAccessTokenSilently({
          authorizationParams: { audience },
        });

        const response = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch user profile');

        const profile = await response.json();
        if (!cancelled) {
          setRole(profile.role);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setRole('member'); // Default to member on error
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchRole();
    return () => { cancelled = true; };
  }, [isAuthenticated, getAccessTokenSilently, fetchCount]);

  return {
    role,
    isAdmin: role === 'admin',
    isLoading,
    error,
    refetch: () => setFetchCount((c) => c + 1),
  };
}
