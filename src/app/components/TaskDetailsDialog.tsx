import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, AlertCircle, FolderKanban, Pencil, Trash2, User, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useApiClient } from '../lib/api-client';

export interface TaskDetailsData {
  id: string;
  title: string;
  description?: string | null;
  status?: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'Low' | 'Medium' | 'High';
  assignee?: string | null;
  dueDate?: string | null;
  project?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskDetailsData | null;
  onEdit: () => void;
  onDelete?: () => void;
}

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  duration_minutes: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

interface TimeEntryFormState {
  hours: string;
  minutes: string;
  logged_at: string;
  description: string;
}

interface TimeEntryEditorState {
  id: string;
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStatusIcon(status?: TaskDetailsData['status']) {
  switch (status) {
    case 'In Progress':
      return <AlertCircle className="h-4 w-4" />;
    case 'In Review':
      return <AlertCircle className="h-4 w-4" />;
    case 'Done':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'To Do':
    default:
      return <Circle className="h-4 w-4" />;
  }
}

function getStatusClasses(status?: TaskDetailsData['status']) {
  switch (status) {
    case 'In Progress':
      return 'bg-accent-soft text-blue-600';
    case 'In Review':
      return 'bg-purple-50 text-purple-600';
    case 'Done':
      return 'bg-green-50 text-green-600';
    case 'To Do':
    default:
      return 'bg-surface-hover text-text-secondary';
  }
}

function getPriorityClasses(priority?: TaskDetailsData['priority']) {
  switch (priority) {
    case 'High':
      return 'bg-red-50 text-red-600';
    case 'Medium':
      return 'bg-yellow-50 text-yellow-700';
    case 'Low':
    default:
      return 'bg-green-50 text-green-600';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available';

  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatCompactDateTime(value?: string | null) {
  if (!value) return 'Not available';

  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed).replace(', ', ' • ');
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function createTimeEntryForm(): TimeEntryFormState {
  return {
    hours: '',
    minutes: '',
    logged_at: toDateTimeLocalValue(new Date()),
    description: '',
  };
}

function parseDateValue(value?: string | null): Date | null {
  if (!value) return null;

  const localIsoPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
  const match = value.match(localIsoPattern);
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? '0'),
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toApiDateTimeValue(value: string): string {
  if (!value) return value;
  return value.length === 16 ? `${value}:00` : value;
}

function toTimeEntryForm(entry: TimeEntry): TimeEntryFormState {
  const totalMinutes = entry.duration_minutes || 0;
  return {
    hours: totalMinutes >= 60 ? String(Math.floor(totalMinutes / 60)) : '',
    minutes: String(totalMinutes % 60),
    logged_at: toDateTimeLocalValue(parseDateValue(entry.logged_at) ?? new Date()),
    description: entry.description ?? '',
  };
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  const api = useApiClient();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<TimeEntryFormState>(createTimeEntryForm());
  const [editingEntry, setEditingEntry] = useState<TimeEntryEditorState | null>(null);

  useEffect(() => {
    if (!open || !task?.id) {
      return;
    }

    let cancelled = false;

    async function loadTimeEntries() {
      try {
        setIsEntriesLoading(true);
        const response = await api.get<TimeEntry[]>(`/tasks/${task.id}/time-entries`);
        if (!cancelled) {
          setTimeEntries(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        if (!cancelled) {
          setTimeEntries([]);
          toast.error(error instanceof Error ? error.message : 'Unable to load time entries.');
        }
      } finally {
        if (!cancelled) {
          setIsEntriesLoading(false);
        }
      }
    }

    void loadTimeEntries();

    return () => {
      cancelled = true;
    };
  }, [api, open, task?.id]);

  useEffect(() => {
    if (!open) {
      setIsLogFormOpen(false);
      setEntryError(null);
      setEntryForm(createTimeEntryForm());
      setEditingEntry(null);
    }
  }, [open]);

  const totalLoggedMinutes = useMemo(
    () => timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
    [timeEntries],
  );

  const recentEntries = useMemo(() => timeEntries.slice(0, 5), [timeEntries]);

  const handleSaveTimeEntry = async () => {
    if (!task?.id) {
      return;
    }

    const hours = Number(entryForm.hours || '0');
    const minutes = Number(entryForm.minutes || '0');
    const durationMinutes = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);

    if (durationMinutes <= 0) {
      setEntryError('Enter a duration greater than 0 minutes.');
      return;
    }

    if (!entryForm.logged_at) {
      setEntryError('Logged date is required.');
      return;
    }

    try {
      setIsSavingEntry(true);
      setEntryError(null);
      const payload = {
        duration_minutes: durationMinutes,
        logged_at: toApiDateTimeValue(entryForm.logged_at),
        description: entryForm.description.trim() || null,
      };

      if (editingEntry) {
        const updated = await api.patch<TimeEntry>(
          `/tasks/${task.id}/time-entries/${editingEntry.id}`,
          payload,
        );
        setTimeEntries((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
        toast.success('Time entry updated.');
      } else {
        const created = await api.post<TimeEntry>(`/tasks/${task.id}/time-entries`, payload);
        setTimeEntries((current) => [created, ...current]);
        toast.success('Time entry logged.');
      }

      setEntryForm(createTimeEntryForm());
      setIsLogFormOpen(false);
      setEditingEntry(null);
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Unable to log time.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,52rem)] w-[min(92vw,56rem)] max-w-4xl flex-col overflow-hidden border-border-subtle bg-surface p-0 shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-divider px-6 pb-4 pt-5">
          <DialogTitle
            className="break-words pr-10 text-2xl leading-tight text-text-primary"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {task?.title || 'Task Details'}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            Review the task details before making changes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(task?.status)}`}
            >
              {getStatusIcon(task?.status)}
              {task?.status || 'To Do'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPriorityClasses(task?.priority)}`}
            >
              {task?.priority || 'Medium'}
            </span>
          </div>

          <div className="rounded-xl border border-divider bg-surface-sunken p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Description
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {task?.description?.trim() || 'No description provided.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Project
              </p>
              <div className="flex min-w-0 items-start gap-2 text-sm text-text-primary">
                <FolderKanban className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <span className="min-w-0 break-words leading-6">
                  {task?.project || 'No project assigned'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Assignee
              </p>
              <div className="flex min-w-0 items-start gap-2 text-sm text-text-primary">
                <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <span className="min-w-0 break-all leading-6 text-text-secondary">
                  {task?.assignee || 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Due Date
              </p>
              <div className="flex min-w-0 items-start gap-2 text-sm text-text-primary">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <span className="min-w-0 break-words leading-6">
                  {task?.dueDate || 'Not set'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Created By
              </p>
              <p className="min-w-0 break-all text-sm leading-6 text-text-secondary">
                {task?.createdBy || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Created
              </p>
              <p className="text-sm text-text-primary">{formatDateTime(task?.createdAt)}</p>
            </div>

            <div className="rounded-xl border border-divider bg-surface p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Last Updated
              </p>
              <p className="text-sm text-text-primary">{formatDateTime(task?.updatedAt)}</p>
            </div>
          </div>

          <section className="rounded-2xl border border-divider bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Time Tracking
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-text-tertiary" />
                  <p className="text-lg font-semibold text-text-primary">{formatDuration(totalLoggedMinutes)}</p>
                  <span className="text-sm text-text-secondary">
                    total across {timeEntries.length} entr{timeEntries.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLogFormOpen((current) => !current);
                  setEntryError(null);
                  if (isLogFormOpen) {
                    setEditingEntry(null);
                    setEntryForm(createTimeEntryForm());
                  }
                }}
              >
                Log Time
              </Button>
            </div>

            {isLogFormOpen ? (
              <div className="mt-4 rounded-xl border border-divider bg-surface-sunken p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Hours</label>
                    <Input
                      type="number"
                      min="0"
                      value={entryForm.hours}
                      onChange={(event) => setEntryForm((current) => ({ ...current, hours: event.target.value }))}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Minutes</label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={entryForm.minutes}
                      onChange={(event) => setEntryForm((current) => ({ ...current, minutes: event.target.value }))}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Logged Date</label>
                  <Input
                    type="datetime-local"
                    value={entryForm.logged_at}
                    onChange={(event) => setEntryForm((current) => ({ ...current, logged_at: event.target.value }))}
                    className="w-full"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Notes</label>
                  <Textarea
                    value={entryForm.description}
                    onChange={(event) => setEntryForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Add context for this time entry"
                    className="min-h-24"
                  />
                </div>

                {entryError ? <p className="mt-3 text-sm text-red-600">{entryError}</p> : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsLogFormOpen(false);
                      setEntryError(null);
                      setEditingEntry(null);
                      setEntryForm(createTimeEntryForm());
                    }}
                    disabled={isSavingEntry}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void handleSaveTimeEntry()} disabled={isSavingEntry}>
                    {isSavingEntry ? 'Saving...' : editingEntry ? 'Update Time Entry' : 'Save Time Entry'}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {isEntriesLoading ? (
                <div className="rounded-xl border border-divider bg-surface-sunken px-4 py-6 text-sm text-text-secondary">
                  Loading time entries...
                </div>
              ) : recentEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-subtle bg-surface-sunken px-4 py-6 text-sm text-text-secondary">
                  No time logged for this task yet.
                </div>
              ) : (
                recentEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-divider bg-surface-sunken px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-medium text-text-primary">
                            {formatDuration(entry.duration_minutes)}
                          </p>
                          <p className="break-all text-xs text-text-tertiary">
                            {entry.user?.full_name || entry.user?.email || entry.user_id}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntry({ id: entry.id });
                              setEntryForm(toTimeEntryForm(entry));
                              setEntryError(null);
                              setIsLogFormOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                        {entry.description ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs font-medium text-text-secondary sm:pl-4">
                        {formatCompactDateTime(entry.logged_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-divider bg-surface px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button type="button" onClick={onEdit} className="bg-accent text-white hover:bg-accent-hover">
            <Pencil className="h-4 w-4" />
            Edit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
