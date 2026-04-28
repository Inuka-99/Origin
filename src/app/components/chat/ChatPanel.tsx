/**
 * ChatPanel — message thread for the selected channel.
 *
 * Loads history via /chat/channels/:id/messages, subscribes to the
 * realtime broadcast, and ships sends + attachments via the
 * useMessages hook.
 */
import { Paperclip, Send, Users, Loader2, X, Download } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMessages } from '../../lib/chat/useMessages';
import type { ChatChannelSummary, ChatMessage } from '../../lib/chat/types';
import { useAuthUser } from '../../auth';

interface Props {
  channel: ChatChannelSummary | null;
  onMessageSent?: () => void;
  onChannelSeen?: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

function channelHeader(channel: ChatChannelSummary, selfId: string | null): { title: string; subtitle: string } {
  if (channel.kind === 'group') {
    return {
      title: channel.name ?? 'Untitled group',
      subtitle: `${channel.members.length} member${channel.members.length === 1 ? '' : 's'}`,
    };
  }
  const other = channel.members.find((m) => m.user_id !== selfId);
  return {
    title: other?.full_name?.trim() || other?.email || 'Direct message',
    subtitle: other?.email ?? 'Direct message',
  };
}

function senderLabel(m: ChatMessage): string {
  return m.sender?.full_name?.trim() || m.sender?.email || 'Unknown';
}

function senderInitials(m: ChatMessage): string {
  const label = senderLabel(m);
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function ChatPanel({ channel, onMessageSent, onChannelSeen }: Props) {
  const { user: auth0User } = useAuthUser();
  const selfId = auth0User?.sub ?? null;
  const channelId = channel?.id ?? null;
  const { messages, loading, sending, error, send, markRead } = useMessages(channelId);
  const [input, setInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, channelId]);

  // Mark channel as read once we've loaded its messages — but
  // ONLY ONCE per channelId. The ref guard prevents the effect
  // from re-firing when callback identities change (which would
  // hammer POST /chat/channels/:id/read on every render and burn
  // the rate limiter). Switching channels resets it naturally.
  const lastMarkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!channelId || loading) return;
    if (lastMarkedRef.current === channelId) return;
    lastMarkedRef.current = channelId;
    void markRead();
    onChannelSeen?.();
  }, [channelId, loading, markRead, onChannelSeen]);

  const handleSend = async () => {
    if (!channelId) return;
    const text = input;
    const file = pendingFile;
    if (!text.trim() && !file) return;
    try {
      await send({ content: text, file: file ?? undefined });
      setInput('');
      setPendingFile(null);
      onMessageSent?.();
    } catch {
      // Error already surfaced via the hook's `error` state.
    }
  };

  const header = useMemo(() => (channel ? channelHeader(channel, selfId) : null), [channel, selfId]);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No conversation selected
          </h3>
          <p className="text-sm text-text-tertiary">
            Pick a chat from the left or start a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-accent font-semibold flex-shrink-0"
            style={{ background: channel.kind === 'group' ? 'var(--accent)' : '#9333EA' }}
          >
            {channel.kind === 'group' ? <Users className="w-5 h-5" /> : (header?.title ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold truncate"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
            >
              {header?.title}
            </h2>
            <p className="text-sm text-text-tertiary truncate">{header?.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3 styled-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
            No messages yet — say hi 👋
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.sender_id === selfId;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-on-accent text-xs font-semibold flex-shrink-0"
                      style={{ background: '#9333EA' }}
                    >
                      {m.sender?.avatar_url ? (
                        <img src={m.sender.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        senderInitials(m)
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 min-w-0">
                    {!isOwn && channel.kind === 'group' && (
                      <span className="text-xs font-medium text-text-secondary">{senderLabel(m)}</span>
                    )}
                    {m.content && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          isOwn ? 'bg-accent text-on-accent' : 'bg-surface-hover text-text-primary'
                        }`}
                      >
                        {m.content}
                      </div>
                    )}
                    {m.attachment_url && (
                      isImage(m.attachment_type) ? (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-xs rounded-xl overflow-hidden border border-border-subtle hover:opacity-90 transition-opacity"
                        >
                          <img src={m.attachment_url} alt={m.attachment_name ?? ''} className="w-full h-auto" />
                        </a>
                      ) : (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.attachment_name ?? undefined}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                            isOwn
                              ? 'bg-accent-hover text-on-accent'
                              : 'bg-surface-sunken text-text-primary hover:bg-surface-hover'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{m.attachment_name ?? 'Attachment'}</span>
                          {m.attachment_size != null && (
                            <span className="text-xs opacity-75">{bytes(m.attachment_size)}</span>
                          )}
                        </a>
                      )
                    )}
                    <div className={`text-xs text-text-tertiary ${isOwn ? 'text-right' : 'text-left'}`}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-status-danger bg-status-danger-soft border border-status-danger rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {pendingFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-xs">
            <Paperclip className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
            <span className="truncate text-text-primary">{pendingFile.name}</span>
            <span className="text-text-tertiary flex-shrink-0">{bytes(pendingFile.size)}</span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="ml-auto p-1 rounded hover:bg-surface-hover text-text-secondary"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-surface-sunken border border-border-subtle rounded-2xl overflow-hidden">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={sending}
              className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-sm text-text-primary placeholder:text-text-tertiary disabled:opacity-60"
              style={{ maxHeight: '160px' }}
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach a file"
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-4 h-4 text-text-secondary" />
              </button>
              <span className="text-xs text-text-tertiary">{sending ? 'Sending…' : 'Enter to send'}</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!input.trim() && !pendingFile)}
            className="px-4 py-3 bg-accent text-on-accent rounded-2xl hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 Send
          </button>
        </div>
      </div>
    </div>
  );
}
