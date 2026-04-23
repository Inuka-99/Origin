import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApiClient } from '../lib/api-client';

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

/* ------------------------------------------------------------------ */
/*  Fallback data (shown when no real logs exist yet)                   */
/* ------------------------------------------------------------------ */

interface FallbackItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar: string;
}

const fallbackActivities: FallbackItem[] = [
  { id: '1', user: 'Michael Chen', action: 'completed task', target: 'Design system updates', time: '5 minutes ago', avatar: 'MC' },
  { id: '2', user: 'Emma Wilson', action: 'commented on', target: 'Q1 Planning document', time: '12 minutes ago', avatar: 'EW' },
  { id: '3', user: 'James Rodriguez', action: 'created project', target: 'Mobile App Redesign', time: '1 hour ago', avatar: 'JR' },
  { id: '4', user: 'Lisa Park', action: 'assigned you to', target: 'API Integration', time: '2 hours ago', avatar: 'LP' },
  { id: '5', user: 'David Kim', action: 'moved task', target: 'User Testing to In Progress', time: '3 hours ago', avatar: 'DK' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

function actionVerb(action: string): string {
  const map: Record<string, string> = {
    task_created: 'created task',
    task_updated: 'updated task',
    task_deleted: 'deleted task',
    status_changed: 'changed status on',
    priority_changed: 'changed priority on',
    assigned: 'assigned user to',
    unassigned: 'unassigned user from',
    project_created: 'created project',
    project_updated: 'updated project',
    project_deleted: 'deleted project',
    member_added: 'added member to',
    member_removed: 'removed member from',
    comment_added: 'commented on',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RecentActivity() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ActivityEntry[]>('/activity-logs/recent?count=5')
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [api]);

  const hasRealData = loaded && entries.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Recent Activity
        </h3>
        <button
          onClick={() => navigate('/activity-log')}
          className="text-xs text-[#204EA7] font-medium hover:underline"
        >
          View all
        </button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {hasRealData
            ? entries.map((entry) => {
                const name = entry.profiles?.full_name ?? 'Unknown';
                const initials = getInitials(name);
                // Try to extract a target name from metadata or description
                const target =
                  (entry.metadata?.name as string) ??
                  (entry.metadata?.entity_name as string) ??
                  entry.description;

                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    {entry.profiles?.avatar_url ? (
                      <img
                        src={entry.profiles.avatar_url}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#204EA7] rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{name}</span>{' '}
                        <span className="text-gray-600">{actionVerb(entry.action)}</span>{' '}
                        <span className="font-semibold text-[#204EA7]">{target}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at)}</p>
                    </div>
                  </div>
                );
              })
            : fallbackActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#204EA7] rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {activity.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-gray-600">{activity.action}</span>{' '}
                      <span className="font-semibold text-[#204EA7]">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
