import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import {
  Activity,
  Filter,
  ChevronDown,
  Search,
  ArrowUpRight,
  CheckCircle2,
  Edit3,
  UserPlus,
  UserMinus,
  FolderPlus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown>;
  project_id: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface ActivityResponse {
  data: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getActionIcon(action: string) {
  switch (action) {
    case 'task_created':
    case 'project_created':
      return FolderPlus;
    case 'task_updated':
    case 'project_updated':
      return Edit3;
    case 'task_deleted':
    case 'project_deleted':
      return Trash2;
    case 'status_changed':
      return RefreshCw;
    case 'priority_changed':
      return ArrowUpRight;
    case 'assigned':
    case 'member_added':
      return UserPlus;
    case 'unassigned':
    case 'member_removed':
      return UserMinus;
    default:
      return CheckCircle2;
  }
}

function getActionColor(action: string): string {
  if (action.includes('created')) return 'bg-green-100 text-green-600';
  if (action.includes('deleted')) return 'bg-red-100 text-red-600';
  if (action.includes('status') || action.includes('updated')) return 'bg-blue-100 text-blue-600';
  if (action.includes('assigned') || action.includes('member')) return 'bg-purple-100 text-purple-600';
  if (action.includes('priority')) return 'bg-amber-100 text-amber-600';
  return 'bg-surface-hover text-text-secondary';
}

function getActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

const entityTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'task', label: 'Tasks' },
  { value: 'project', label: 'Projects' },
  { value: 'member', label: 'Members' },
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'task_created', label: 'Created' },
  { value: 'task_updated', label: 'Updated' },
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'priority_changed', label: 'Priority Changed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'member_added', label: 'Member Added' },
  { value: 'member_removed', label: 'Member Removed' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ActivityLog() {
  const api = useApiClient();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (entityType) params.set('entity_type', entityType);
      if (action) params.set('action', action);

      const res = await api.get<ActivityResponse>(`/activity-logs?${params.toString()}`);
      setEntries(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, entityType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side search filter on description
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.profiles?.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : entries;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      <main className="pt-16 transition-[margin] duration-200 ease-out" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1
                      className="text-2xl font-semibold text-text-primary"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      Activity Log
                    </h1>
                    <p className="text-sm text-text-tertiary">
                      Track edits, status changes, and assignments for transparency.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    showFilters
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-text-secondary border-border-subtle hover:bg-surface-sunken'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {(entityType || action) && (
                    <span className="bg-surface/20 text-xs px-1.5 py-0.5 rounded-full">
                      {[entityType, action].filter(Boolean).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={fetchLogs}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border-subtle text-text-secondary text-sm font-medium hover:bg-surface-sunken transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          {showFilters && (
            <div
              className="bg-surface rounded-xl border border-border-subtle p-4 mb-6"
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                {/* Entity Type Filter */}
                <div className="relative">
                  <select
                    value={entityType}
                    onChange={(e) => {
                      setEntityType(e.target.value);
                      setPage(1);
                    }}
                    className="appearance-none bg-surface border border-border-subtle rounded-lg px-4 py-2.5 pr-10 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
                  >
                    {entityTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>

                {/* Action Filter */}
                <div className="relative">
                  <select
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setPage(1);
                    }}
                    className="appearance-none bg-surface border border-border-subtle rounded-lg px-4 py-2.5 pr-10 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
                  >
                    {actionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                </div>

                {/* Clear Filters */}
                {(entityType || action || searchQuery) && (
                  <button
                    onClick={() => {
                      setEntityType('');
                      setAction('');
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="text-sm text-accent font-medium hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Activity List */}
          <div
            className="bg-surface rounded-xl border border-border-subtle overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_140px_140px_100px] gap-4 px-6 py-3 bg-surface-sunken border-b border-border-subtle">
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Activity</span>
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Action</span>
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Type</span>
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide text-right">Time</span>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-text-tertiary">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading activity...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-text-secondary mb-2">Failed to load activity</p>
                <p className="text-xs text-text-tertiary mb-4">{error}</p>
                <button
                  onClick={fetchLogs}
                  className="text-sm text-accent font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredEntries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-text-tertiary" />
                </div>
                <p className="text-sm font-medium text-text-secondary mb-1">No activity yet</p>
                <p className="text-xs text-text-tertiary">
                  Activity will appear here as changes are made across your workspace.
                </p>
              </div>
            )}

            {/* Entries */}
            {!loading &&
              !error &&
              filteredEntries.map((entry, index) => {
                const ActionIcon = getActionIcon(entry.action);
                const colorClass = getActionColor(entry.action);
                const userName = entry.profiles?.full_name ?? 'Unknown User';
                const initials = getInitials(userName);

                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-[1fr_140px_140px_100px] gap-4 px-6 py-4 items-center hover:bg-surface-sunken transition-colors ${
                      index < filteredEntries.length - 1 ? 'border-b border-divider' : ''
                    }`}
                  >
                    {/* Activity Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.profiles?.avatar_url ? (
                        <img
                          src={entry.profiles.avatar_url}
                          alt={userName}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          <span className="font-medium">{userName}</span>
                        </p>
                        <p className="text-xs text-text-tertiary truncate">{entry.description}</p>
                      </div>
                    </div>

                    {/* Action Badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
                      >
                        <ActionIcon className="w-3 h-3" />
                        {getActionLabel(entry.action).split(' ').pop()}
                      </span>
                    </div>

                    {/* Entity Type */}
                    <div>
                      <span className="text-xs text-text-tertiary capitalize bg-surface-hover px-2.5 py-1 rounded-full">
                        {entry.entity_type}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="text-right" title={formatDate(entry.created_at)}>
                      <span className="text-xs text-text-tertiary">{timeAgo(entry.created_at)}</span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-text-tertiary">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border-subtle text-text-tertiary hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:bg-surface-hover'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-border-subtle text-text-tertiary hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
