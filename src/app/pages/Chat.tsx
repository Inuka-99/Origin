/**
 * Chat.tsx — top-level chat surface.
 *
 * Composes the channels list (sidebar) with the active channel's
 * message panel. Both halves read from the new chat hooks; this
 * page just owns the "which channel is selected" state.
 */
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useState } from 'react';
import { useChannels } from '../lib/chat';

export function Chat() {
  const { channels, loading, error, refresh, createChannel, patchChannel } = useChannels();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = channels.find((c) => c.id === selectedId) ?? null;

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
          onCreated={(c) => setSelectedId(c.id)}
          createChannel={createChannel}
          refresh={refresh}
        />

        <ChatPanel
          channel={selected}
          onMessageSent={() => {
            // Bumping last_read_at locally so the unread badge clears.
            if (selectedId) patchChannel(selectedId, { unread_count: 0 });
          }}
          onChannelSeen={() => {
            if (selectedId) patchChannel(selectedId, { unread_count: 0 });
          }}
        />
      </main>
    </div>
  );
}
