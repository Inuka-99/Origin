import { Calendar, CheckCircle2, Circle, AlertCircle, FolderKanban, Pencil, Trash2, User } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,48rem)] max-w-3xl border-border-subtle bg-surface p-0 shadow-2xl">
        <DialogHeader className="border-b border-divider px-6 pb-4 pt-5">
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

        <div className="space-y-6 px-6 py-5">
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
        </div>

        <DialogFooter className="border-t border-divider px-6 py-4">
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
