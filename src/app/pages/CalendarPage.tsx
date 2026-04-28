/**
 * CalendarPage.tsx
 *
 * Read/write calendar view backed by the real /tasks API.
 *
 * What's wired up:
 *  - Read     : GET /tasks   → all tasks with a due_date become events.
 *  - Create   : "Add Event" / day-tile + button opens the modal pre-set
 *               to the selected day. Submits POST /tasks.
 *  - Update   : Clicking an event opens the same modal in edit mode.
 *               Submits PATCH /tasks/:id.
 *  - Delete   : Edit modal exposes a Delete button. DELETE /tasks/:id.
 *  - Realtime : Subscribes to the tasks channel so changes from other
 *               clients reflect immediately.
 *
 * Month navigation, day selection, priority pip, and the right-side
 * details panel stay as before — only the data source and the
 * interactions changed.
 */

import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { toast } from 'sonner';
import { useApiClient, unwrapList, type PaginatedList } from '../lib/api-client';
import { useTaskRealtime } from '../lib/use-task-realtime';

type ApiPriority = 'low' | 'medium' | 'high' | 'High' | 'Medium' | 'Low';
type ApiStatus = 'todo' | 'in_progress' | 'In Review' | 'Done' | 'completed' | null;

interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: ApiStatus;
  priority: ApiPriority;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectLite {
  id: string;
  name: string;
}

interface TaskEvent {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  due_date: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  projectId: string | null;
  project: string;
}

const STATUS_TO_DISPLAY: Record<string, TaskEvent['status']> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  'In Review': 'In Review',
  Done: 'Done',
  completed: 'Done',
};

const STATUS_TO_API: Record<TaskEvent['status'], string> = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'In Review': 'In Review',
  Done: 'Done',
};

const PRIORITY_DISPLAY: TaskEvent['priority'][] = ['High', 'Medium', 'Low'];
const STATUS_OPTIONS: TaskEvent['status'][] = ['To Do', 'In Progress', 'In Review', 'Done'];

function normalizePriority(p: ApiPriority | string | null | undefined): TaskEvent['priority'] {
  if (!p) return 'Medium';
  const lower = String(p).toLowerCase();
  if (lower === 'high') return 'High';
  if (lower === 'low') return 'Low';
  return 'Medium';
}

function toDisplayStatus(s: ApiStatus | string | null | undefined): TaskEvent['status'] {
  if (!s) return 'To Do';
  return STATUS_TO_DISPLAY[String(s)] ?? 'To Do';
}

/** Convert a yyyy-mm-dd or full ISO string into a local-midnight Date. */
function parseDueDate(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Date-only — treat as local midnight rather than UTC, otherwise
    // events near midnight float into the previous day in some
    // timezones.
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(trimmed);
}

function toApiDate(d: Date): string {
  // Use local components, not toISOString, so we never shift the day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface FormState {
  title: string;
  description: string;
  project_id: string;
  priority: TaskEvent['priority'];
  status: TaskEvent['status'];
  due_date: string;
}

const blankForm: FormState = {
  title: '',
  description: '',
  project_id: '',
  priority: 'Medium',
  status: 'To Do',
  due_date: '',
};

export function Calendar() {
  const api = useApiClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state — null means closed; a string id means edit mode.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -- Loaders ----------------------------------------------------

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiTask[] | PaginatedList<ApiTask>>('/tasks');
      setTasks(unwrapList(response));
    } catch (err) {
      console.error('Failed to load calendar tasks', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await api.get<ProjectLite[] | PaginatedList<ProjectLite>>('/projects');
      setProjects(unwrapList(response));
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  }, [api]);

  useEffect(() => {
    void loadTasks();
    void loadProjects();
  }, [loadTasks, loadProjects]);

  // -- Realtime ---------------------------------------------------

  const upsertTask = useCallback((incoming: ApiTask) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === incoming.id);
      if (idx === -1) return [...prev, incoming];
      const next = prev.slice();
      next[idx] = incoming;
      return next;
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useTaskRealtime({
    onCreated: (t) => upsertTask(t as unknown as ApiTask),
    onUpdated: (t) => upsertTask(t as unknown as ApiTask),
    onDeleted: ({ id }) => removeTask(id),
  });

  // -- Derived ----------------------------------------------------

  const events: TaskEvent[] = useMemo(() => {
    return tasks
      .filter((t): t is ApiTask & { due_date: string } => Boolean(t.due_date))
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        date: parseDueDate(t.due_date),
        due_date: t.due_date,
        priority: normalizePriority(t.priority),
        status: toDisplayStatus(t.status),
        projectId: t.project_id,
        project: projects.find((p) => p.id === t.project_id)?.name ?? 'No project',
      }));
  }, [tasks, projects]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const eventsForDate = useCallback(
    (date: Date) => events.filter((e) => isSameDay(e.date, date)),
    [events],
  );

  const selectedDateEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const getPriorityColor = (priority: TaskEvent['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-status-danger';
      case 'Medium':
        return 'bg-status-warning';
      case 'Low':
        return 'bg-status-success';
    }
  };

  // -- Modal helpers ---------------------------------------------

  const openCreateModal = (date: Date | null) => {
    setEditingId(null);
    setForm({
      ...blankForm,
      due_date: toApiDate(date ?? new Date()),
      project_id: projects[0]?.id ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (event: TaskEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? '',
      project_id: event.projectId ?? '',
      priority: event.priority,
      status: event.status,
      due_date: event.due_date.length >= 10 ? event.due_date.slice(0, 10) : event.due_date,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) return;
    setModalOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const submitForm = async () => {
    setFormError(null);
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!form.due_date) {
      setFormError('Due date is required');
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: STATUS_TO_API[form.status],
      due_date: form.due_date,
    };
    // Only send project_id if the user picked one — the API treats
    // undefined as "leave it" and null as "clear it".
    if (form.project_id) payload.project_id = form.project_id;

    try {
      setSaving(true);
      if (editingId) {
        await api.patch<ApiTask>(`/tasks/${editingId}`, payload);
        toast.success('Task updated');
      } else {
        await api.post<ApiTask>('/tasks', payload);
        toast.success('Task added to calendar');
      }
      // Realtime will refresh the list, but also pull authoritative
      // state in case the broadcast is dropped.
      await loadTasks();
      // After a successful create, jump the calendar's selected day
      // to the new task's date so the user sees it land.
      const newDate = parseDueDate(form.due_date);
      setSelectedDate(newDate);
      if (!isSameMonth(newDate, currentDate)) setCurrentDate(newDate);
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!editingId) return;
    if (!window.confirm('Delete this task? This will also remove it from any synced calendar.')) return;

    try {
      setDeleting(true);
      await api.delete(`/tasks/${editingId}`);
      toast.success('Task deleted');
      removeTask(editingId);
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setFormError(message);
    } finally {
      setDeleting(false);
    }
  };

  // -- Render -----------------------------------------------------

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      <main
        className="pt-16 p-8 transition-[margin] duration-200 ease-out"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1
              className="text-3xl font-semibold mb-2"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
            >
              Calendar
            </h1>
            <p className="text-text-secondary">View and manage tasks by due date</p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal(selectedDate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl shadow-card p-6 hairline border">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-xl font-semibold"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
                >
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
                    title="Jump to today"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={previousMonth}
                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                    title="Previous month"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                    title="Next month"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-text-secondary py-2">
                    {day}
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading tasks…
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dayEvents = eventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        onDoubleClick={() => openCreateModal(day)}
                        title={dayEvents.length > 0 ? `${dayEvents.length} task${dayEvents.length === 1 ? '' : 's'}` : 'Double-click to add a task'}
                        className={`aspect-square p-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-accent border-accent text-on-accent'
                            : isToday
                            ? 'bg-accent-soft border-accent text-text-primary'
                            : isCurrentMonth
                            ? 'bg-surface border-border-subtle hover:bg-surface-sunken text-text-primary'
                            : 'bg-surface-sunken border-divider text-text-tertiary'
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <span className={`text-sm font-medium ${isSelected ? 'text-on-accent' : ''}`}>
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-on-accent' : getPriorityColor(event.priority)
                                  }`}
                                />
                              ))}
                              {dayEvents.length > 2 && (
                                <span className={`text-xs ${isSelected ? 'text-on-accent' : 'text-text-tertiary'}`}>
                                  +{dayEvents.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Events sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-2xl shadow-card p-6 hairline border">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
                >
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </h3>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => openCreateModal(selectedDate)}
                    title="Add task on this day"
                    className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <Plus className="w-4 h-4 text-text-secondary" />
                  </button>
                )}
              </div>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => openEditModal(event)}
                      className="w-full text-left p-4 bg-surface-sunken rounded-lg border border-border-subtle hover:border-accent/40 hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(event.priority)}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-text-primary text-sm mb-1 truncate">
                            {event.title}
                          </h4>
                          <p className="text-xs text-text-secondary truncate">{event.project}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-block px-2 py-0.5 bg-surface rounded text-xs font-medium text-text-secondary">
                              {event.priority} Priority
                            </span>
                            <span className="inline-block px-2 py-0.5 bg-surface rounded text-xs font-medium text-text-secondary">
                              {event.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <button
                    type="button"
                    onClick={() => selectedDate && openCreateModal(selectedDate)}
                    disabled={!selectedDate}
                    className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-accent-soft transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-6 h-6 text-text-tertiary" />
                  </button>
                  <p className="text-sm text-text-secondary">No tasks scheduled</p>
                  <p className="text-xs text-text-tertiary mt-1">Click + or double-click a day to add one</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-surface rounded-2xl shadow-card p-6 mt-4 hairline border">
              <h4 className="text-sm font-semibold mb-3 text-text-primary">Priority Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-danger" />
                  <span className="text-sm text-text-secondary">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-warning" />
                  <span className="text-sm text-text-secondary">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-success" />
                  <span className="text-sm text-text-secondary">Low Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={closeModal}
        >
          <div
            className="bg-surface rounded-2xl shadow-card-lg w-full max-w-lg p-6 hairline border"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
                >
                  {editingId ? 'Edit task' : 'New task'}
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {editingId ? 'Update the task and save your changes.' : 'Schedule a task on a specific day.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving || deleting}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="What needs to happen?"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Optional notes…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Due date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Project</label>
                  <select
                    value={form.project_id}
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                    className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskEvent['priority'] }))}
                    className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    {PRIORITY_DISPLAY.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskEvent['status'] }))}
                    className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-status-danger bg-status-danger-soft border border-status-danger rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
              {editingId ? (
                <button
                  type="button"
                  onClick={deleteCurrent}
                  disabled={saving || deleting}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-status-danger hover:bg-status-danger-soft rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || deleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={saving || deleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save changes' : 'Add task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
