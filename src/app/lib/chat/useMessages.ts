/**
 * useMessages.ts — message list for a single chat channel, with
 * realtime subscription to that channel's broadcast and a `send`
 * helper that accepts text content and/or an attachment URL.
 *
 * Attachments are uploaded directly to Supabase Storage via a
 * server-minted signed URL — the server never sees the file bytes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiClient, type PaginatedList, unwrapList } from '../api-client';
import { supabaseClient } from '../supabase-client';
import type { ChatMessage, UploadUrlResponse } from './types';

export interface UseMessagesReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  send: (params: { content?: string; file?: File }) => Promise<void>;
  markRead: () => Promise<void>;
}

export function useMessages(channelId: string | null): UseMessagesReturn {
  const api = useApiClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ChatMessage[] | PaginatedList<ChatMessage>>(
        `/chat/channels/${channelId}/messages?limit=200`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setMessages(unwrapList(response));
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api, channelId]);

  // Reload when the channel changes.
  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  // Realtime — subscribe to the per-channel broadcast.
  useEffect(() => {
    if (!channelId) return;
    const ch = supabaseClient.channel(`chat:${channelId}`);
    ch.on('broadcast', { event: 'message:created' }, (event) => {
      const incoming = event.payload as ChatMessage | undefined;
      if (!incoming) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });
    void ch.subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, [channelId]);

  const markRead = useCallback(async () => {
    if (!channelId) return;
    try {
      await api.post(`/chat/channels/${channelId}/read`);
    } catch {
      // Non-fatal — the user can still see messages, the unread
      // count just won't reset.
    }
  }, [api, channelId]);

  const send = useCallback<UseMessagesReturn['send']>(
    async ({ content, file }) => {
      if (!channelId) return;
      const text = content?.trim();
      if (!text && !file) return;

      setSending(true);
      setError(null);
      try {
        let attachment: {
          attachment_url?: string;
          attachment_name?: string;
          attachment_type?: string;
          attachment_size?: number;
        } = {};

        if (file) {
          // 1) Ask the server for a signed upload URL.
          const upload = await api.post<UploadUrlResponse>('/chat/attachments/upload-url', {
            filename: file.name,
            content_type: file.type,
            size: file.size,
          });
          // 2) Upload directly to Supabase Storage.
          const { error: uploadError } = await supabaseClient.storage
            .from('chat-attachments')
            .uploadToSignedUrl(upload.path, upload.token, file, {
              contentType: file.type || 'application/octet-stream',
            });
          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          attachment = {
            attachment_url: upload.publicUrl,
            attachment_name: file.name,
            attachment_type: file.type || undefined,
            attachment_size: file.size,
          };
        }

        const message = await api.post<ChatMessage>(
          `/chat/channels/${channelId}/messages`,
          { content: text, ...attachment },
        );
        // Optimistically append (the broadcast will arrive too,
        // but the dedupe in the realtime handler protects us).
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Send failed');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [api, channelId],
  );

  return { messages, loading, sending, error, send, markRead };
}
