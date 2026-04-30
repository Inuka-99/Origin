/**
 * useChannels.ts — list/create/refresh chat channels for the user.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiClient } from '../api-client';
import type { ChannelKind, ChatChannelSummary, PersonSummary } from './types';

export interface UseChannelsReturn {
  channels: ChatChannelSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createChannel: (input: { kind: ChannelKind; name?: string; member_ids: string[] }) => Promise<ChatChannelSummary>;
  /** Best-effort: recompute the unread count for a single channel locally. */
  patchChannel: (id: string, patch: Partial<ChatChannelSummary>) => void;
}

export function useChannels(): UseChannelsReturn {
  const api = useApiClient();
  const [channels, setChannels] = useState<ChatChannelSummary[]>([]);
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
      const data = await api.get<ChatChannelSummary[]>('/chat/channels', {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setChannels(data ?? []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  const createChannel = useCallback<UseChannelsReturn['createChannel']>(
    async (input) => {
      const created = await api.post<ChatChannelSummary>('/chat/channels', input);
      setChannels((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [created, ...prev];
      });
      return created;
    },
    [api],
  );

  const patchChannel = useCallback((id: string, patch: Partial<ChatChannelSummary>) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  return { channels, loading, error, refresh, createChannel, patchChannel };
}

/**
 * Light-weight people search for the new-chat picker.
 *
 * Debounced — we wait 250ms after the user stops typing before
 * firing the request. Otherwise every keystroke would hit the API,
 * which is both wasteful and pretty fast at tripping rate limits.
 */
export function useChatPeople(query: string): { people: PersonSummary[]; loading: boolean } {
  const api = useApiClient();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Hold off on firing until the user has paused for 250ms. If a
    // new keystroke comes in before then, the timeout is cancelled
    // and a new one starts.
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = controller;
      (async () => {
        try {
          setLoading(true);
          const params = new URLSearchParams();
          if (query.trim()) params.set('q', query.trim());
          const path = params.toString() ? `/chat/people?${params}` : '/chat/people';
          const data = await api.get<PersonSummary[]>(path, { signal: controller.signal });
          if (!controller.signal.aborted) setPeople(data ?? []);
        } catch {
          if (!controller.signal.aborted) setPeople([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, query]);

  return { people, loading };
}
