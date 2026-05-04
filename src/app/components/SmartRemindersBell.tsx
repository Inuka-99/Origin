import { Bell, CalendarClock, CheckCheck, Clock3, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthUser } from '../auth/useAuthUser';
import { useTasks, type Task } from '../lib/useTasks';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type ReminderKind = 'overdue' | 'today' | 'tomorrow' | 'high-priority';

interface ReminderItem {
  id: string;
  kind: ReminderKind;
  title: string;
  taskName: string;
  dueDateLabel?: string;
  taskId: string;
  priority?: string;
  status?: string;
  assignedToCurrentUser: boolean;
}

const READ_STORAGE_KEY = 'origin-smart-reminders-read';
const DELETED_STORAGE_KEY = 'origin-smart-reminders-deleted';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}

function formatDueDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function getPriorityBadge(priority?: string) {
  switch ((priority ?? '').toLowerCase()) {
    case 'high':
    case 'urgent':
      return 'bg-red-50 text-red-700';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700';
    case 'low':
      return 'bg-green-50 text-green-700';
    default:
      return 'bg-surface-hover text-text-secondary';
  }
}

function getStatusBadge(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'in_progress':
    case 'in progress':
      return 'bg-accent-soft text-blue-600';
    case 'done':
      return 'bg-green-50 text-green-700';
    case 'todo':
      return 'bg-surface-hover text-text-secondary';
    default:
      return 'bg-surface-hover text-text-secondary';
  }
}

function getReminderAccent(kind: ReminderKind) {
  switch (kind) {
    case 'overdue':
      return 'text-red-700 bg-red-50';
    case 'today':
      return 'text-orange-700 bg-orange-50';
    case 'tomorrow':
      return 'text-blue-700 bg-blue-50';
    case 'high-priority':
      return 'text-purple-700 bg-purple-50';
    default:
      return 'text-text-secondary bg-surface-hover';
  }
}

function getReminderIcon(kind: ReminderKind) {
  switch (kind) {
    case 'overdue':
      return <AlertTriangle className="h-4 w-4" />;
    case 'today':
      return <Clock3 className="h-4 w-4" />;
    case 'tomorrow':
      return <CalendarClock className="h-4 w-4" />;
    case 'high-priority':
    default:
      return <ArrowUpRight className="h-4 w-4" />;
  }
}

function createReminder(task: Task, userId: string | null): ReminderItem[] {
  if (task.status === 'done') {
    return [];
  }

  const reminders: ReminderItem[] = [];
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const now = new Date();
  const assignedToCurrentUser = Boolean(userId && task.assigned_to === userId);
  const taskPrefix = assignedToCurrentUser ? 'Your task' : 'Task';

  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const delta = daysBetween(now, dueDate);
    const dueLabel = formatDueDate(task.due_date);

    if (delta < 0) {
      reminders.push({
        id: `overdue:${task.id}:${task.due_date ?? ''}`,
        kind: 'overdue',
        title: `${taskPrefix} is overdue`,
        taskName: task.title,
        dueDateLabel: dueLabel,
        taskId: task.id,
        priority: task.priority,
        status: task.status,
        assignedToCurrentUser,
      });
    } else if (delta === 0) {
      reminders.push({
        id: `today:${task.id}:${task.due_date ?? ''}`,
        kind: 'today',
        title: `${taskPrefix} is due today`,
        taskName: task.title,
        dueDateLabel: dueLabel,
        taskId: task.id,
        priority: task.priority,
        status: task.status,
        assignedToCurrentUser,
      });
    } else if (delta === 1 || delta === 2) {
      reminders.push({
        id: `soon:${task.id}:${task.due_date ?? ''}`,
        kind: 'tomorrow',
        title: delta === 1 ? `${taskPrefix} is due tomorrow` : `${taskPrefix} is due soon`,
        taskName: task.title,
        dueDateLabel: dueLabel,
        taskId: task.id,
        priority: task.priority,
        status: task.status,
        assignedToCurrentUser,
      });
    }
  }

  if ((task.priority ?? '').toLowerCase() === 'high') {
    reminders.push({
      id: `priority:${task.id}:${task.priority ?? ''}`,
      kind: 'high-priority',
      title: assignedToCurrentUser ? 'High-priority task needs attention' : 'High-priority task update',
      taskName: task.title,
      dueDateLabel: task.due_date ? formatDueDate(task.due_date) : undefined,
      taskId: task.id,
      priority: task.priority,
      status: task.status,
      assignedToCurrentUser,
    });
  }

  return reminders;
}

export function SmartRemindersBell({
  taskRoute,
  className,
  iconClassName,
}: {
  taskRoute: string;
  className?: string;
  iconClassName?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthUser();
  const { tasks, loading } = useTasks({ limit: 500 });
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(READ_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setReadIds(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      setReadIds([]);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DELETED_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setDeletedIds(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      setDeletedIds([]);
    }
  }, []);

  const reminders = useMemo(() => {
    const reminderItems = tasks.flatMap((task) => createReminder(task, user?.sub ?? null));
    const deduped = new Map<string, ReminderItem>();
    for (const reminder of reminderItems) {
      if (!deduped.has(reminder.id)) {
        deduped.set(reminder.id, reminder);
      }
    }
    return Array.from(deduped.values()).sort((left, right) => {
      const order: Record<ReminderKind, number> = {
        overdue: 0,
        today: 1,
        tomorrow: 2,
        'high-priority': 3,
      };
      return order[left.kind] - order[right.kind];
    });
  }, [tasks, user?.sub]);

  const unreadReminders = useMemo(
    () => reminders.filter((reminder) => !readIds.includes(reminder.id)),
    [readIds, reminders],
  );

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !deletedIds.includes(reminder.id)),
    [deletedIds, reminders],
  );

  const readVisibleReminders = useMemo(
    () => visibleReminders.filter((reminder) => readIds.includes(reminder.id)),
    [readIds, visibleReminders],
  );

  const unreadCount = unreadReminders.length;

  const persistReadIds = (nextIds: string[]) => {
    setReadIds(nextIds);
    try {
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(nextIds));
    } catch {
      // ignore storage failures; reminders still work for the session
    }
  };

  const persistDeletedIds = (nextIds: string[]) => {
    setDeletedIds(nextIds);
    try {
      window.localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(nextIds));
    } catch {
      // ignore storage failures; reminders still work for the session
    }
  };

  const markReminderRead = (reminderId: string) => {
    if (readIds.includes(reminderId)) return;
    persistReadIds([...readIds, reminderId]);
  };

  const markAllRead = () => {
    persistReadIds(Array.from(new Set([...readIds, ...reminders.map((reminder) => reminder.id)])));
  };

  const deleteReadMessages = () => {
    const idsToDelete = readVisibleReminders.map((reminder) => reminder.id);
    if (idsToDelete.length === 0) return;
    persistDeletedIds(Array.from(new Set([...deletedIds, ...idsToDelete])));
  };

  const openReminder = (reminder: ReminderItem) => {
    markReminderRead(reminder.id);
    setIsOpen(false);
    const suffix = reminder.taskId ? `?reminderTask=${encodeURIComponent(reminder.taskId)}` : '';
    if (location.pathname !== taskRoute) {
      navigate(`${taskRoute}${suffix}`);
      return;
    }
    navigate(`${taskRoute}${suffix}`, { replace: true });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open smart reminders"
          className={className ?? 'relative p-2 hover:bg-surface-hover rounded-lg transition-colors'}
        >
          <Bell className={iconClassName ?? 'w-5 h-5 text-text-secondary'} />
          {unreadCount > 0 ? (
            <>
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] rounded-2xl border-border-subtle bg-surface p-0 shadow-2xl">
        <div className="border-b border-divider px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Smart Reminders</p>
              <p className="mt-1 text-xs text-text-secondary">
                {unreadCount > 0 ? `${unreadCount} unread reminder${unreadCount === 1 ? '' : 's'}` : 'You’re all caught up.'}
              </p>
            </div>
            {visibleReminders.length > 0 ? (
              <div className="flex flex-col items-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="h-8 px-2 text-xs text-text-secondary hover:text-text-primary"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deleteReadMessages}
                  disabled={readVisibleReminders.length === 0}
                  className="h-8 px-2 text-xs text-text-secondary hover:text-text-primary disabled:text-text-tertiary"
                >
                  Delete read messages
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="max-h-[24rem] overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="rounded-xl px-3 py-8 text-center text-sm text-text-secondary">
              Loading reminders...
            </div>
          ) : visibleReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-surface-sunken px-4 py-8 text-center">
              <p className="text-sm font-medium text-text-primary">No reminders right now.</p>
              <p className="mt-1 text-xs text-text-secondary">
                Upcoming deadlines and task updates will appear here.
              </p>
            </div>
          ) : (
            visibleReminders.map((reminder) => {
              const unread = !readIds.includes(reminder.id);
              return (
                <button
                  key={reminder.id}
                  type="button"
                  onClick={() => openReminder(reminder)}
                  className="mb-2 w-full rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-border-subtle hover:bg-surface-sunken"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-2 ${getReminderAccent(reminder.kind)}`}>
                      {getReminderIcon(reminder.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">{reminder.title}</p>
                        {unread ? <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" /> : null}
                      </div>
                      <p className="mt-1 break-words text-sm text-text-secondary">{reminder.taskName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {reminder.dueDateLabel ? (
                          <span className="rounded-full bg-surface-hover px-2 py-1 text-[11px] font-medium text-text-secondary">
                            Due {reminder.dueDateLabel}
                          </span>
                        ) : null}
                        {reminder.priority ? (
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${getPriorityBadge(reminder.priority)}`}>
                            {reminder.priority}
                          </span>
                        ) : null}
                        {reminder.status ? (
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${getStatusBadge(reminder.status)}`}>
                            {reminder.status.replace('_', ' ')}
                          </span>
                        ) : null}
                        {reminder.assignedToCurrentUser ? (
                          <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                            Assigned to you
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
