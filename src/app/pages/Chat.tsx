/**
 * Chat.tsx — top-level chat surface.
 *
 * Composes the channels list (sidebar) with the active channel's
 * message panel. Both halves read from the new chat hooks; this
 * page just owns the "which channel is selected" state.
 *
 * IMPORTANT: callbacks passed to ChatPanel are memoized with
 * useCallback. Inline arrow functions get a fresh identity each
 * render, which would re-fire ChatPanel's markRead effect (a POST)
 * on every render and burn through the rate limiter in seconds.
 */
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useCallback, useState } from 'react';
import { useChannels } from '../lib/chat';

export function Chat() {
  const { channels, loading, error, refresh, createChannel, patchChannel } = useChannels();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  const handleMessageSent = useCallback(() => {
    if (selectedId) patchChannel(selectedId, { unread_count: 0 });
  }, [selectedId, patchChannel]);

  const handleChannelSeen = useCallback(() => {
    if (selectedId) patchChannel(selectedId, { unread_count: 0 });
  }, [selectedId, patchChannel]);

  const handleCreated = useCallback((c: { id: string }) => {
    setSelectedId(c.id);
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      <main
        className="pt-16 h-screen flex transition-[margin] duration-200 ease-out"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <ChatSidebar
          channels={channels}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={handleCreated}
          createChannel={createChannel}
          refresh={refresh}
        />

        <ChatPanel
          channel={selected}
          onMessageSent={handleMessageSent}
          onChannelSeen={handleChannelSeen}
        />
      </main>
    </div>
  );
}
