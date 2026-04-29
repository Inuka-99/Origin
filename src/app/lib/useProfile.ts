/**
 * useProfile.ts
 *
 * Loads the current user's profile from /users/me, with Auth0 fields
 * as a fallback for first-time logins where Supabase only has the
 * placeholder row created by UserSyncInterceptor.
 *
 * Provides:
 *   - profile: the loaded profile (or null while loading)
 *   - loading: boolean
 *   - error: string | null
 *   - save(updates): PATCH /users/me, returns the fresh profile
 *   - refresh(): re-fetch
 *
 * The hook intentionally exposes the raw Supabase shape (full_name,
 * avatar_url, …) so consumers can choose how to split it for the UI.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useApiClient } from './api-client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  job_title?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<UserProfile, 'email' | 'full_name' | 'avatar_url' | 'job_title' | 'bio'>
>;

export interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  save: (updates: ProfileUpdate) => Promise<UserProfile>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const api = useApiClient();
  const { user: auth0User } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const data = await api.get<UserProfile>('/users/me', {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      // First-login fallback: the row Supabase auto-creates has
      // empty email + full_name. Populate from Auth0 so the UI
      // doesn't show blank fields the user has to retype. We don't
      // PATCH automatically — let them save once to make it
      // authoritative on the Supabase side.
      const filled: UserProfile = { ...data };
      if (!filled.email && auth0User?.email) filled.email = auth0User.email;
      if (!filled.full_name && auth0User?.name) filled.full_name = auth0User.name;
      if (!filled.avatar_url && auth0User?.picture) filled.avatar_url = auth0User.picture;

      setProfile(filled);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api, auth0User?.email, auth0User?.name, auth0User?.picture]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  const save = useCallback(
    async (updates: ProfileUpdate) => {
      const updated = await api.patch<UserProfile>('/users/me', updates);
      setProfile(updated);
      return updated;
    },
    [api],
  );

  return { profile, loading, error, save, refresh };
}
