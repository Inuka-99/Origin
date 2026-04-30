import { MobileTopBar } from '../components/MobileTopBar';
import {
  Activity,
  Filter,
  ChevronDown,
  Search,
  CheckCircle2,
  Edit3,
  UserPlus,
  UserMinus,
  FolderPlus,
  Trash2,
  RefreshCw,
  ArrowUpRight,
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ActivityLogMobile() {
  const api = useApiClient();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

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
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [api, page, entityType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="min-h-screen bg-canvas">
      <MobileTopBar />

      <main className="pt-16 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <h1
              className="text-xl font-semibold text-text-primary"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Activity
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${
                showFilters ? 'bg-accent text-white border-accent' : 'bg-surface text-text-secondary border-border-subtle'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={fetchLogs}
              className="p-2 rounded-lg bg-surface border border-border-subtle text-text-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-surface rounded-xl border border-border-subtle p-3 mb-4 space-y-3">
            <div className="relative">
              <select
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                className="w-full appearance-none bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-secondary"
              >
                <option value="">All Types</option>
                <option value="task">Tasks</option>
                <option value="project">Projects</option>
                <option value="member">Members</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                className="w-full appearance-none bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-secondary"
              >
                <option value="">All Actions</option>
                <option value="task_created">Created</option>
                <option value="task_updated">Updated</option>
                <option value="status_changed">Status Changed</option>
                <option value="assigned">Assigned</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-text-tertiary mb-2">Failed to load activity</p>
            <button onClick={fetchLogs} className="text-sm text-accent font-medium">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-text-tertiary">No activity yet</p>
          </div>
        )}

        {/* Activity Cards */}
        {!loading && !error && (
          <div className="space-y-3">
            {entries.map((entry) => {
              const ActionIcon = getActionIcon(entry.action);
              const colorClass = getActionColor(entry.action);
              const userName = entry.profiles?.full_name ?? 'Unknown User';
              const initials = getInitials(userName);

              return (
                <div
                  key={entry.id}
                  className="bg-surface rounded-xl border border-border-subtle p-4"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-start gap-3">
                    {entry.profiles?.avatar_url ? (
                      <img
                        src={entry.profiles.avatar_url}
                        alt={userName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">{userName}</span>
                        <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">{timeAgo(entry.created_at)}</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-2 line-clamp-2">{entry.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                          <ActionIcon className="w-3 h-3" />
                          {getActionLabel(entry.action).split(' ').pop()}
                        </span>
                        <span className="text-xs text-text-tertiary capitalize bg-surface-hover px-2 py-0.5 rounded-full">
                          {entry.entity_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {!loading && entries.length > 0 && page * limit < total && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full mt-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm font-medium text-accent hover:bg-surface-sunken transition-colors"
          >
            Load more
          </button>
        )}
      </main>
    </div>
  );
}
