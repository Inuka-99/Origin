/**
 * ChatSidebar — list of the user's channels with search, tabs, and
 * lightweight modals for creating a new DM or a new group.
 */
import { Search, Plus, Users, MessageCircle, X, Loader2, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useChatPeople } from '../../lib/chat/useChannels';
import type { ChatChannelSummary, PersonSummary } from '../../lib/chat/types';
import { useAuthUser } from '../../auth';

interface Props {
  channels: ChatChannelSummary[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (channel: ChatChannelSummary) => void;
  createChannel: (input: { kind: 'dm' | 'group'; name?: string; member_ids: string[] }) => Promise<ChatChannelSummary>;
  refresh: () => Promise<void>;
}

type FilterTab = 'all' | 'groups' | 'direct';

function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`;
  if (ms < 7 * 24 * 60 * 60_000) return `${Math.floor(ms / (24 * 60 * 60_000))}d ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(channel: ChatChannelSummary, selfId: string | null | undefined): string {
  if (channel.kind === 'group') return channel.name ?? 'Untitled group';
  const other = channel.members.find((m) => m.user_id !== selfId);
  return other?.full_name?.trim() || other?.email || 'Direct message';
}

function lastMessagePreview(channel: ChatChannelSummary): string {
  const m = channel.last_message;
  if (!m) return 'No messages yet';
  if (m.content) return m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content;
  if (m.attachment_name) return `📎 ${m.attachment_name}`;
  return 'Attachment';
}

export function ChatSidebar({
  channels,
  loading,
  error,
  selectedId,
  onSelect,
  onCreated,
  createChannel,
}: Props) {
  const { user: auth0User } = useAuthUser();
  const selfId = auth0User?.sub ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [creating, setCreating] = useState<null | 'dm' | 'group'>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return channels
      .filter((c) => {
        if (activeTab === 'groups' && c.kind !== 'group') return false;
        if (activeTab === 'direct' && c.kind !== 'dm') return false;
        if (!q) return true;
        const label = displayName(c, selfId).toLowerCase();
        return label.includes(q) || lastMessagePreview(c).toLowerCase().includes(q);
      })
      .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
  }, [channels, searchQuery, activeTab, selfId]);

  const groups = filtered.filter((c) => c.kind === 'group');
  const dms = filtered.filter((c) => c.kind === 'dm');

  return (
    <div className="w-80 bg-surface flex flex-col h-[calc(100vh-64px)]" style={{ borderRight: '1px solid var(--border-subtle)' }}>
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
          Messages
        </h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          {(['all', 'groups', 'direct'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-accent text-on-accent'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'groups' ? 'Groups' : 'Direct'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreating('group')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
          <button
            type="button"
            onClick={() => setCreating('dm')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-border-subtle text-text-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            New DM
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto styled-scrollbar">
        {loading && channels.length === 0 ? (
          <div className="p-8 flex items-center justify-center text-sm text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading conversations…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-status-danger bg-status-danger-soft border border-status-danger rounded-lg m-4">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary text-sm">
            {channels.length === 0 ? 'No conversations yet — start one above.' : 'Nothing matches your search.'}
          </div>
        ) : (
          <>
            {activeTab === 'all' ? (
              <>
                {groups.length > 0 && (
                  <Section icon={<Users className="w-3.5 h-3.5" />} label={`Groups (${groups.length})`}>
                    {groups.map((c) => (
                      <Item key={c.id} channel={c} selected={selectedId === c.id} onSelect={() => onSelect(c.id)} selfId={selfId} />
                    ))}
                  </Section>
                )}
                {dms.length > 0 && (
                  <Section icon={<MessageCircle className="w-3.5 h-3.5" />} label={`Direct Messages (${dms.length})`}>
                    {dms.map((c) => (
                      <Item key={c.id} channel={c} selected={selectedId === c.id} onSelect={() => onSelect(c.id)} selfId={selfId} />
                    ))}
                  </Section>
                )}
              </>
            ) : (
              <div className="p-4 space-y-1">
                {filtered.map((c) => (
                  <Item key={c.id} channel={c} selected={selectedId === c.id} onSelect={() => onSelect(c.id)} selfId={selfId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {creating && (
        <CreateChannelModal
          mode={creating}
          selfId={selfId}
          onClose={() => setCreating(null)}
          onSubmit={async (payload) => {
            try {
              const created = await createChannel(payload);
              toast.success(payload.kind === 'dm' ? 'DM started' : `Created ${created.name}`);
              onCreated(created);
              setCreating(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Could not create channel');
            }
          }}
        />
      )}
    </div>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
        {icon}
        {label}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Item({
  channel,
  selected,
  onSelect,
  selfId,
}: {
  channel: ChatChannelSummary;
  selected: boolean;
  onSelect: () => void;
  selfId: string | null;
}) {
  const label = displayName(channel, selfId);
  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '·';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
        selected
          ? 'bg-accent-soft'
          : 'hover:bg-surface-hover'
      }`}
      style={{ border: selected ? '1px solid var(--accent)' : '1px solid transparent' }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-accent font-semibold"
          style={{ background: channel.kind === 'group' ? 'var(--accent)' : '#9333EA' }}
        >
          {channel.kind === 'group' ? <Users className="w-5 h-5" /> : initials}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className={`text-sm font-semibold truncate ${channel.unread_count > 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
            {label}
          </h4>
          <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">
            {relativeTime(channel.last_message?.created_at ?? channel.updated_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs truncate ${channel.unread_count > 0 ? 'text-text-secondary font-medium' : 'text-text-tertiary'}`}>
            {lastMessagePreview(channel)}
          </p>
          {channel.unread_count > 0 && (
            <span
              className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {channel.unread_count}
            </span>
          )}
        </div>
        {channel.kind === 'group' && (
          <p className="text-xs text-text-tertiary mt-1">{channel.members.length} members</p>
        )}
      </div>
    </button>
  );
}

function CreateChannelModal({
  mode,
  selfId,
  onClose,
  onSubmit,
}: {
  mode: 'dm' | 'group';
  selfId: string | null;
  onClose: () => void;
  onSubmit: (payload: { kind: 'dm' | 'group'; name?: string; member_ids: string[] }) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<PersonSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { people, loading } = useChatPeople(query);

  const toggle = (p: PersonSummary) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id);
      if (mode === 'dm') return [p]; // DMs only allow one peer.
      return [...prev, p];
    });
  };

  const submit = async () => {
    if (mode === 'dm' && selected.length !== 1) return;
    if (mode === 'group' && (selected.length === 0 || !groupName.trim())) return;
    setSubmitting(true);
    try {
      const memberIds = selected.map((s) => s.id);
      // Server includes the caller automatically, but it's harmless to add.
      if (selfId && !memberIds.includes(selfId)) memberIds.push(selfId);
      await onSubmit({
        kind: mode,
        name: mode === 'group' ? groupName.trim() : undefined,
        member_ids: memberIds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-card-lg w-full max-w-md p-5 hairline border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {mode === 'dm' ? 'New direct message' : 'New group'}
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {mode === 'dm' ? 'Pick the teammate you want to message.' : 'Name your group and add members.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'group' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-text-secondary mb-1">Group name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Design Team"
              className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
        )}

        <label className="block text-xs font-medium text-text-secondary mb-1">
          {mode === 'dm' ? 'Find someone' : 'Add members'}
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-10 pr-3 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {s.full_name || s.email}
                <button type="button" onClick={() => toggle(s)} aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto rounded-lg border border-border-subtle styled-scrollbar">
          {loading ? (
            <div className="p-4 text-sm text-text-secondary flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          ) : people.length === 0 ? (
            <div className="p-4 text-sm text-text-tertiary">No matches.</div>
          ) : (
            people.map((p) => {
              const isSelected = selected.some((s) => s.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-on-accent text-xs font-semibold"
                    style={{ background: 'var(--accent)' }}
                  >
                    {(p.full_name || p.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {p.full_name || p.email || p.id}
                    </div>
                    {p.email && p.full_name && (
                      <div className="text-xs text-text-tertiary truncate">{p.email}</div>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-accent" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={
              submitting ||
              (mode === 'dm' && selected.length !== 1) ||
              (mode === 'group' && (selected.length === 0 || !groupName.trim()))
            }
            className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'dm' ? 'Start chat' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
