import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, Plus, Calendar, AlertCircle, CheckCircle2, Circle, Trash2, Edit3, ArrowUpDown } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskDetailsDialog, type TaskDetailsData } from '../components/TaskDetailsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useApiClient, unwrapList, type PaginatedList } from '../lib/api-client';
import { useTaskRealtime } from '../lib/use-task-realtime';

interface Task {
  id: string;
  title: string;
  description: string | null;
  project: string;
  projectId: string | null;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  dueDateValue: string | null;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  assignee: string;
  assigneeId: string | null;
}

interface PendingTaskDeletion {
  id: string;
  title: string;
}

type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: 'todo' | 'in_progress' | 'In Review' | 'Done' | 'completed' | null;
  priority: 'High' | 'Medium' | 'Low';
  due_date: string | null;
  assignee_id: string | null;
  assigned_to: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectMemberLite = {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  };
};

type ProjectMemberMap = Record<string, ProjectMemberLite[]>;

type DueDateFilter = 'all' | 'overdue' | 'today' | 'next7' | 'no_due';
type SortMode = 'newest' | 'title_asc' | 'deadline_asc';

export function MyTasks() {
  const api = useApiClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Task['status'] | ''>('');
  const [bulkPriority, setBulkPriority] = useState<Task['priority'] | ''>('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskDetailsData | null>(null);
  const [pendingTaskDeletion, setPendingTaskDeletion] = useState<PendingTaskDeletion | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    project_id: string;
    status: Task['status'];
    priority: Task['priority'];
    due_date: string;
    assignee_id: string;
  }>({
    title: '',
    description: '',
    project_id: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
    assignee_id: '',
  });

  const getMemberLabel = (member?: ProjectMemberLite): string | null => {
    if (!member) return null;
    return member.full_name
      || member.email
      || member.profiles?.full_name
      || member.profiles?.email
      || member.user_id;
  };

  const normalizeTask = (task: ApiTask, memberMap: ProjectMemberMap = projectMembers): Task => {
    const projectMembersList = task.project_id ? memberMap[task.project_id] : [];
    const assignee = projectMembersList?.find(m => m.user_id === task.assignee_id);
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      project: task.project_id || 'Unknown Project',
      projectId: task.project_id ?? null,
      priority: (task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)) as Task['priority'] || 'Medium',
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date',
      dueDateValue: task.due_date ? task.due_date.slice(0, 10) : null,
      status: (task.status
        ? ((() => {
            const map: Record<string, string> = {
              'todo': 'To Do',
              'in_progress': 'In Progress',
              'In Review': 'In Review',
              'Done': 'Done',
              'completed': 'Done',
            };
            return (map[task.status] || task.status) as Task['status'];
          })())
        : 'To Do') as Task['status'],
      assignee: getMemberLabel(assignee) ?? 'Unassigned',
      assigneeId: task.assignee_id,
    };
  };

  const getTaskProjectName = (task: Task): string => {
    if (!task.projectId) return 'Unknown Project';
    const match = projects.find((project) => project.id === task.projectId);
    return match?.name ?? task.project;
  };

  const databaseToDisplayStatus = (status: string): string => {
    if (!status) return 'To Do';
    const map: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'In Review': 'In Review',
      'Done': 'Done',
      'completed': 'Done',
    };
    return map[status] || status;
  };

  const displayToDatabaseStatus = (status: Task['status']): string => {
    const map: Record<Task['status'], string> = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'In Review': 'In Review',
      'Done': 'Done',
    };
    return map[status] || status;
  };

  const getPriorityEnumValue = (priority: string): string => {
    return priority.toLowerCase();
  };

  const getTaskAssigneeName = (task: Task): string => {
    if (!task.projectId || !task.assigneeId) return task.assignee;
    const member = projectMembers[task.projectId]?.find((item) => item.user_id === task.assigneeId);
    return getMemberLabel(member) ?? task.assignee;
  };

  const getTodayValue = () => new Date().toISOString().slice(0, 10);

  const getNextWeekValue = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  };

  const loadMembersForProjects = async (
    projectIds: string[],
    existingMembers: ProjectMemberMap = projectMembers,
  ): Promise<ProjectMemberMap> => {
    const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)));
    const missingProjectIds = uniqueProjectIds.filter((projectId) => !existingMembers[projectId]);

    if (missingProjectIds.length === 0) {
      return existingMembers;
    }

    const entries = await Promise.all(
      missingProjectIds.map(async (projectId) => {
        try {
          const members = await api.get<ProjectMemberLite[]>(`/projects/${projectId}/members`);
          return [projectId, members] as const;
        } catch (error) {
          console.error('Failed to load project members', error);
          return [projectId, []] as const;
        }
      }),
    );

    const nextMembers = {
      ...existingMembers,
      ...Object.fromEntries(entries),
    };
    setProjectMembers(nextMembers);
    return nextMembers;
  };

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      // /tasks now returns { data, total, page, limit }; unwrapList
      // tolerates both the new envelope and the legacy bare-array shape.
      const response = await api.get<ApiTask[] | PaginatedList<ApiTask>>('/tasks?limit=200');
      const taskList = unwrapList(response);
      const memberMap = await loadMembersForProjects(
        taskList.map((task) => task.project_id).filter((projectId): projectId is string => Boolean(projectId)),
      );
      setTasks(taskList.map((task) => normalizeTask(task, memberMap)));
    } catch (error) {
      console.error('Failed to load tasks', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      // /projects returns { data, total, page, limit }; unwrap so we
      // can use it as a plain array regardless of envelope shape.
      type ProjectLite = { id: string; name: string };
      const response = await api.get<ProjectLite[] | PaginatedList<ProjectLite>>('/projects?limit=200');
      const list = unwrapList(response);
      setProjects(list);

      if (!taskForm.project_id && list.length > 0) {
        setTaskForm((prev) => ({ ...prev, project_id: list[0].id }));
      }
    } catch (error) {
      console.error('Failed to load projects', error);
      setProjects([]);
    }
  };

  const handleTaskCreated = useCallback((task: ApiTask) => {
    setTasks((prev) => {
      if (prev.some((item) => item.id === task.id)) return prev;
      return [...prev, normalizeTask(task)];
    });
  }, [projects, projectMembers]);

  const handleTaskUpdated = useCallback((task: ApiTask) => {
    setTasks((prev) => {
      const normalizedTask = normalizeTask(task);
      let found = false;
      const updatedTasks = prev.map((item) => {
        if (item.id === task.id) {
          found = true;
          return normalizedTask;
        }
        return item;
      });
      return found ? updatedTasks : [...updatedTasks, normalizedTask];
    });
  }, [projects, projectMembers]);

  const handleTaskDeleted = useCallback((payload: { id: string }) => {
    setTasks((prev) => prev.filter((task) => task.id !== payload.id));
  }, []);

  useTaskRealtime({
    onCreated: handleTaskCreated,
    onUpdated: handleTaskUpdated,
    onDeleted: handleTaskDeleted,
  });
  const loadProjectMembers = async (projectId: string) => {
    if (!projectId || projectMembers[projectId]) return;
    try {
      const members = await api.get<ProjectMemberLite[]>(`/projects/${projectId}/members`);
      setProjectMembers(prev => ({ ...prev, [projectId]: members }));
    } catch (error) {
      console.error('Failed to load project members', error);
    }
  };

  useEffect(() => {
    void loadProjects();
    void loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = getTodayValue();
    const nextWeek = getNextWeekValue();

    const filtered = tasks.filter((task) => {
      const projectName = getTaskProjectName(task);
      const matchesSearch = !query || [
        task.title,
        task.description ?? '',
        projectName,
        getTaskAssigneeName(task),
      ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesDueDate =
        dueDateFilter === 'all' ||
        (dueDateFilter === 'no_due' && !task.dueDateValue) ||
        (dueDateFilter === 'today' && task.dueDateValue === today) ||
        (dueDateFilter === 'overdue' && Boolean(task.dueDateValue) && task.dueDateValue! < today && task.status !== 'Done') ||
        (dueDateFilter === 'next7' && Boolean(task.dueDateValue) && task.dueDateValue! >= today && task.dueDateValue! <= nextWeek);

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'title_asc') {
        return left.title.localeCompare(right.title);
      }

      if (sortMode === 'deadline_asc') {
        const leftDue = left.dueDateValue ?? '9999-12-31';
        const rightDue = right.dueDateValue ?? '9999-12-31';
        return leftDue.localeCompare(rightDue) || left.title.localeCompare(right.title);
      }

      return 0;
    });
  }, [tasks, projects, searchQuery, statusFilter, priorityFilter, dueDateFilter, sortMode]);

  const selectedIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedIdSet.has(task.id)),
    [tasks, selectedIdSet],
  );
  const visibleSelectedCount = filteredTasks.filter((task) => selectedIdSet.has(task.id)).length;
  const areAllVisibleSelected = filteredTasks.length > 0 && visibleSelectedCount === filteredTasks.length;

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (areAllVisibleSelected) {
        filteredTasks.forEach((task) => next.delete(task.id));
      } else {
        filteredTasks.forEach((task) => next.add(task.id));
      }
      return Array.from(next);
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedTasks.length === 0) {
      setBulkError('Select at least one task first.');
      return;
    }

    if (!bulkStatus && !bulkPriority) {
      setBulkError('Choose a status or priority to apply.');
      return;
    }

    const payload: Record<string, string> = {};
    if (bulkStatus) payload.status = displayToDatabaseStatus(bulkStatus);
    if (bulkPriority) payload.priority = getPriorityEnumValue(bulkPriority);

    setIsBulkUpdating(true);
    setBulkError(null);
    try {
      const updatedTasks = await Promise.all(
        selectedTasks.map((task) => api.patch<ApiTask>(`/tasks/${task.id}`, payload)),
      );
      const updatedById = new Map(updatedTasks.map((task) => [task.id, normalizeTask(task)]));
      setTasks((current) =>
        current.map((task) => updatedById.get(task.id) ?? task),
      );
      setSelectedTaskIds([]);
      setBulkStatus('');
      setBulkPriority('');
    } catch (error) {
      console.error('Bulk task update failed', error);
      setBulkError('Bulk update failed. Check permissions and try again.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'High':
        return 'text-red-600 bg-red-50';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'Low':
        return 'text-green-600 bg-green-50';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'To Do':
        return 'text-text-secondary bg-surface-hover';
      case 'In Progress':
        return 'text-blue-600 bg-accent-soft';
      case 'In Review':
        return 'text-purple-600 bg-purple-50';
      case 'Done':
        return 'text-green-600 bg-green-50';
    }
  };

  const openAddTaskModal = () => {
    setIsEditMode(false);
    setEditingTaskId(null);
    setFormError(null);

    const defaultProjectId = projects[0]?.id ?? '';

    setTaskForm({
      title: '',
      description: '',
      project_id: defaultProjectId,
      status: 'To Do',
      priority: 'Medium',
      due_date: '',
      assignee_id: '',
    });
    if (defaultProjectId) {
      loadProjectMembers(defaultProjectId);
    }
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setIsEditMode(false);
    setEditingTaskId(null);
  };

  const openEditTaskModal = async (task: Task) => {
    setIsEditMode(true);
    setEditingTaskId(task.id);
    setFormError(null);

    try {
      // Fetch the full task data to get assignee_id
      const fullTask = await api.get<ApiTask>(`/tasks/${task.id}`);
      
      const assignedProjectId = fullTask.project_id ?? '';

      setTaskForm({
        title: fullTask.title,
        description: fullTask.description ?? '',
        project_id: assignedProjectId,
        status: databaseToDisplayStatus(fullTask.status),
        priority: (fullTask.priority?.charAt(0).toUpperCase() + fullTask.priority?.slice(1)) as Task['priority'] || 'Medium',
        due_date: fullTask.due_date ? new Date(fullTask.due_date).toISOString().slice(0, 10) : '',
        assignee_id: fullTask.assignee_id || '',
      });
      if (assignedProjectId) {
        loadProjectMembers(assignedProjectId);
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to load task for editing', error);
      setFormError('Failed to load task details');
    }
  };

  const handleProjectChange = (projectId: string) => {
    setTaskForm(prev => ({ ...prev, project_id: projectId, assignee_id: '' }));
    loadProjectMembers(projectId);
  };

  const openTaskDetailsModal = async (task: Task) => {
    try {
      const fullTask = await api.get<ApiTask>(`/tasks/${task.id}`);
      const projectName = fullTask.project_id
        ? (projects.find((project) => project.id === fullTask.project_id)?.name ?? task.project)
        : task.project;
      const memberList = fullTask.project_id ? projectMembers[fullTask.project_id] : [];
      const assigneeMatch = memberList?.find((member) => member.user_id === fullTask.assignee_id);
      const assigneeLabel = getMemberLabel(assigneeMatch) ?? task.assignee;

      setSelectedTaskDetails({
        id: fullTask.id,
        title: fullTask.title,
        description: fullTask.description,
        status: databaseToDisplayStatus(fullTask.status) as TaskDetailsData['status'],
        priority: (fullTask.priority?.charAt(0).toUpperCase() + fullTask.priority?.slice(1)) as TaskDetailsData['priority'],
        assignee: assigneeLabel || 'Unassigned',
        dueDate: fullTask.due_date ? new Date(fullTask.due_date).toLocaleDateString() : 'Not set',
        project: projectName || 'No project assigned',
        createdAt: fullTask.created_at ?? null,
        updatedAt: fullTask.updated_at ?? null,
        createdBy: fullTask.created_by ?? null,
      });
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load task details', error);
      setFormError('Failed to load task details');
    }
  };

  const handleEditFromDetails = async () => {
    if (!selectedTaskDetails) return;
    setIsDetailsOpen(false);
    const summaryTask = tasks.find((task) => task.id === selectedTaskDetails.id);
    if (summaryTask) {
      await openEditTaskModal(summaryTask);
    }
  };

  const handleDeleteFromDetails = () => {
    if (!selectedTaskDetails) return;
    setIsDetailsOpen(false);
    setPendingTaskDeletion({
      id: selectedTaskDetails.id,
      title: selectedTaskDetails.title,
    });
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      setFormError('Title is required.');
      return;
    }

    const projectId = taskForm.project_id || projects[0]?.id;
    if (!projectId) {
      setFormError('A project is required. Select a project or create one first.');
      return;
    }

    const payload = {
      project_id: projectId,
      title: taskForm.title,
      description: taskForm.description.trim() || null,
      status: displayToDatabaseStatus(taskForm.status),
      priority: getPriorityEnumValue(taskForm.priority),
      due_date: taskForm.due_date || null,
      assignee_id: taskForm.assignee_id || null,
    };

    try {
      if (isEditMode && editingTaskId) {
        const updated = await api.patch<ApiTask>(`/tasks/${editingTaskId}`, payload);
        setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? normalizeTask(updated) : t)));
      } else {
        const created = await api.post<ApiTask>('/tasks', payload);
        setTasks((previous) =>
          previous.some((task) => task.id === created.id)
            ? previous
            : [...previous, normalizeTask(created)],
        );
      }
      closeTaskModal();
    } catch (error) {
      console.error('Failed saving task', error);
      setFormError('Unable to save task. Please try again.');
    }
  };

  const requestTaskDeletion = (task: Pick<Task, 'id' | 'title'>) => {
    setPendingTaskDeletion({ id: task.id, title: task.title });
  };

  const confirmTaskDeletion = async () => {
    if (!pendingTaskDeletion) return;

    try {
      setIsDeletingTask(true);
      await api.delete(`/tasks/${pendingTaskDeletion.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== pendingTaskDeletion.id));
      setPendingTaskDeletion(null);
    } catch (error) {
      console.error('Unable to delete task', error);
      alert('Task deletion failed.');
    } finally {
      setIsDeletingTask(false);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'To Do':
        return <Circle className="w-4 h-4" />;
      case 'In Progress':
        return <AlertCircle className="w-4 h-4" />;
      case 'In Review':
        return <AlertCircle className="w-4 h-4" />;
      case 'Done':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="pt-16 p-8 transition-[margin] duration-200 ease-out" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              My Tasks
            </h1>
            <p className="text-text-secondary">Track and manage all tasks assigned to you</p>
          </div>
          <button onClick={openAddTaskModal} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-surface rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="min-w-36 pl-9 pr-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Due Date Filter */}
          <select
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
            className="min-w-36 px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="next7">Next 7 Days</option>
            <option value="no_due">No Due Date</option>
          </select>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="min-w-40 pl-9 pr-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="newest">Newest First</option>
              <option value="title_asc">Alphabetical</option>
              <option value="deadline_asc">Deadline</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTaskIds.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4 shadow-sm">
            <span className="text-sm font-medium text-text-primary">
              {selectedTaskIds.length} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as Task['status'] | '')}
              className="min-w-40 rounded-lg border border-border-subtle bg-surface-sunken px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Status...</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
            </select>
            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value as Task['priority'] | '')}
              className="min-w-40 rounded-lg border border-border-subtle bg-surface-sunken px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Priority...</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={isBulkUpdating}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {isBulkUpdating ? 'Updating...' : 'Apply'}
            </button>
            <button
              onClick={() => {
                setSelectedTaskIds([]);
                setBulkError(null);
              }}
              disabled={isBulkUpdating}
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Clear
            </button>
            {bulkError && <span className="text-sm text-red-600">{bulkError}</span>}
          </div>
        )}

        {/* Task Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {tasks.filter(t => t.status !== 'Done').length}
            </div>
            <div className="text-sm text-text-secondary">Active Tasks</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {tasks.filter(t => t.status === 'In Progress').length}
            </div>
            <div className="text-sm text-text-secondary">In Progress</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {tasks.filter(t => t.dueDate === 'Today').length}
            </div>
            <div className="text-sm text-text-secondary">Due Today</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {tasks.filter(t => t.status === 'Done').length}
            </div>
            <div className="text-sm text-text-secondary">Completed</div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-sunken border-b border-border-subtle">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={areAllVisibleSelected}
                      onChange={toggleVisibleSelection}
                      aria-label="Select all visible tasks"
                      className="h-4 w-4 rounded border-border-strong accent-[var(--accent)]"
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Task Name</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Project</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Priority</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Due Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-text-primary"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer hover:bg-surface-sunken"
                    onClick={() => {
                      void openTaskDetailsModal(task);
                    }}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIdSet.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select ${task.title}`}
                        className="h-4 w-4 rounded border-border-strong accent-[var(--accent)]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">{getTaskProjectName(task)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar className="w-4 h-4" />
                        <span className={task.dueDate === 'Today' ? 'text-red-600 font-medium' : ''}>
                          {task.dueDate}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </span>
                    </td>
                    <td className="flex items-center gap-2 px-6 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openEditTaskModal(task);
                        }}
                        className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestTaskDeletion(task);
                        }}
                        className="rounded border border-red-700 bg-surface p-1 text-red-700 transition-all duration-200 hover:bg-red-700 hover:text-white hover:shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-text-tertiary">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                You have no tasks
              </h3>
              <p className="text-text-secondary">Create a task or join a project with tasks.</p>
            </div>
          ) : null}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-surface rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Task' : 'Create Task'}</h2>
                <button onClick={closeTaskModal} className="text-text-tertiary hover:text-text-secondary">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Task Title</label>
                  <input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Task title"
                    className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    name="title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add task context or notes"
                    className="mt-1 min-h-24 w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    name="description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary">Project</label>
                  <select
                    value={taskForm.project_id}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    name="project_id"
                  >
                    {projects
                      .map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value as Task['status'] }))}
                      name="status"
                      className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                      name="priority"
                      className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Due Date</label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))}
                      name="due_date"
                      className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Assignee</label>
                    <select
                      value={taskForm.assignee_id}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, assignee_id: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      name="assignee_id"
                    >
                      <option value="">Unassigned</option>
                      {projectMembers[taskForm.project_id]?.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {getMemberLabel(member)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <div className="flex justify-end gap-2 pt-3">
                  <button onClick={closeTaskModal} className="px-4 py-2 rounded-lg border border-border-strong text-sm text-text-secondary hover:bg-surface-hover">
                    Cancel
                  </button>
                  <button onClick={saveTask} className="px-4 py-2 rounded-lg bg-accent text-sm text-white hover:bg-accent-hover">
                    {isEditMode ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <TaskDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          task={selectedTaskDetails}
          onEdit={() => {
            void handleEditFromDetails();
          }}
          onDelete={() => {
            handleDeleteFromDetails();
          }}
        />

        <AlertDialog
          open={Boolean(pendingTaskDeletion)}
          onOpenChange={(open) => {
            if (!open && !isDeletingTask) {
              setPendingTaskDeletion(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Delete Task
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingTaskDeletion
                  ? `Are you sure you want to delete "${pendingTaskDeletion.title}"?`
                  : 'Are you sure you want to delete this task?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTask}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmTaskDeletion();
                }}
                disabled={isDeletingTask}
                className="border border-red-700 bg-surface text-red-700 transition-all duration-200 hover:bg-red-700 hover:text-white hover:shadow-sm"
              >
                {isDeletingTask ? 'Deleting...' : 'Delete Task'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
