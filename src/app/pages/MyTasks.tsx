import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, ChevronDown, Plus, Calendar, AlertCircle, CheckCircle2, Circle, Trash2, Edit3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useApiClient } from '../lib/api-client';
import { useClickOutside } from '../lib/useClickOutside';

interface Task {
  id: string;
  title: string;
  project: string;
  projectId: string | null;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  dueDateValue: string | null;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  assignee: string;
}

type ApiTask = {
  id: string;
  title: string;
  project_id: string | null;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  due_date: string | null;
};

type PriorityFilter = 'all' | Task['priority'];
type DueDateFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'no-date';
type SortOption = 'default' | 'title-asc' | 'due-asc' | 'priority-desc';

const priorityLabels: Record<PriorityFilter, string> = {
  all: 'All Priorities',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
};

const dueDateLabels: Record<DueDateFilter, string> = {
  all: 'All Due Dates',
  today: 'Due Today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  'no-date': 'No Due Date',
};

const sortLabels: Record<SortOption, string> = {
  default: 'Default Order',
  'title-asc': 'Title A-Z',
  'due-asc': 'Due Date',
  'priority-desc': 'Priority High-Low',
};

export function MyTasks() {
  const api = useApiClient();
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [displayedTasks, setDisplayedTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const latestSearchRequestRef = useRef(0);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    project_id: string;
    status: Task['status'];
    priority: Task['priority'];
    due_date: string;
  }>({
    title: '',
    project_id: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
  });

  useClickOutside(priorityMenuRef, () => setIsPriorityMenuOpen(false));
  useClickOutside(sortMenuRef, () => setIsSortMenuOpen(false));

  const normalizeTask = (task: ApiTask): Task => ({
    id: task.id,
    title: task.title,
    project: task.project_id ? task.project_id : 'Standalone',
    projectId: task.project_id ?? null,
    priority: (task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)) as Task['priority'] || 'Medium',
    dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date',
    dueDateValue: task.due_date,
    status: (task.status
      ?.split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'To Do') as Task['status'],
    assignee: 'Unassigned',
  });

  const getTaskProjectName = (task: Task): string => {
    if (!task.projectId) return 'Standalone';
    const match = projects.find((project) => project.id === task.projectId);
    return match?.name ?? task.project;
  };

  const getStatusEnumValue = (status: string): string => {
    const map: Record<string, string> = {
      'todo': 'To Do',
      'to do': 'To Do',
      'in progress': 'In Progress',
      'in_progress': 'In Progress',
      'in-progress': 'In Progress',
      'in review': 'In Review',
      'in_review': 'In Review',
      'review': 'In Review',
      'done': 'Done',
    };

    const normalized = status.trim().toLowerCase();
    return map[normalized] ?? status;
  };

  const getPriorityEnumValue = (priority: string): string => {
    return priority.toLowerCase();
  };

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ApiTask[]>('/tasks');
      const normalizedTasks = data.map(normalizeTask);
      setTasks(normalizedTasks);
      setDisplayedTasks(normalizedTasks);
    } catch (error) {
      console.error('Failed to load tasks', error);
      setTasks([]);
      setDisplayedTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const buildTasksPath = () => {
    const params = new URLSearchParams();
    const trimmedSearch = searchQuery.trim();

    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    if (priorityFilter !== 'all') {
      params.set('priority', priorityFilter);
    }

    if (dueDateFilter !== 'all') {
      params.set('dueDate', dueDateFilter);
    }

    if (sortBy !== 'default') {
      params.set('sortBy', sortBy);
    }

    const queryString = params.toString();
    return queryString ? `/tasks?${queryString}` : '/tasks';
  };

  const loadProjects = async () => {
    try {
      let data = await api.get<{id:string;name:string}[]>('/projects');

      const standaloneProject = data?.find((project) => project.name === 'Standalone');
      if (!standaloneProject) {
        const createdStandalone = await api.post<{id:string;name:string}>('/projects', { name: 'Standalone' });
        data = [createdStandalone, ...(data ?? [])];
      }

      setProjects(data ?? []);

      if (!taskForm.project_id && (data?.length ?? 0) > 0) {
        setTaskForm((previous) => ({ ...previous, project_id: data![0].id }));
      }
    } catch (error) {
      console.error('Failed to load projects', error);
      setProjects([]);
    }
  };

  useEffect(() => {
    void loadProjects();
    void loadTasks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') ?? '');
  }, [location.search]);

  useEffect(() => {
    const trimmedSearch = searchQuery.trim();
    const hasActiveFilters =
      statusFilter !== 'all'
      || priorityFilter !== 'all'
      || dueDateFilter !== 'all'
      || sortBy !== 'default';

    if (!trimmedSearch && !hasActiveFilters) {
      latestSearchRequestRef.current += 1;
      setDisplayedTasks(tasks);
      setIsSearchLoading(false);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsSearchLoading(true);
        try {
          const data = await api.get<ApiTask[]>(buildTasksPath());
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }
          setDisplayedTasks(data.map(normalizeTask));
        } catch (error) {
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }
          console.error('Failed to search tasks', error);
          setDisplayedTasks([]);
        } finally {
          if (latestSearchRequestRef.current === requestId) {
            setIsSearchLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [api, dueDateFilter, priorityFilter, searchQuery, sortBy, statusFilter, tasks]);

  const filteredTasks = displayedTasks;

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
        return 'text-gray-600 bg-gray-100';
      case 'In Progress':
        return 'text-blue-600 bg-blue-50';
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
      project_id: defaultProjectId,
      status: 'To Do',
      priority: 'Medium',
      due_date: '',
    });
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setIsEditMode(true);
    setEditingTaskId(task.id);
    setFormError(null);

    const assignedProjectId = task.projectId ? task.projectId : projects.find((project) => project.name === 'Standalone')?.id ?? '';

    setTaskForm({
      title: task.title,
      project_id: assignedProjectId,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDateValue ? task.dueDateValue.slice(0, 10) : '',
    });
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      setFormError('Title is required.');
      return;
    }

    const standaloneProject = projects.find((project) => project.name === 'Standalone');
    const projectId = taskForm.project_id || standaloneProject?.id || projects[0]?.id;
    if (!projectId) {
      setFormError('A project is required. Select a project or create one first.');
      return;
    }

    const payload = {
      project_id: projectId,
      title: taskForm.title,
      status: getStatusEnumValue(taskForm.status),
      priority: getPriorityEnumValue(taskForm.priority),
      due_date: taskForm.due_date || null,
    };

    try {
      if (isEditMode && editingTaskId) {
        const updated = await api.patch<ApiTask>(`/tasks/${editingTaskId}`, payload);
        setTasks((previous) => previous.map((task) => (task.id === editingTaskId ? normalizeTask(updated) : task)));
      } else {
        const created = await api.post<ApiTask>('/tasks', payload);
        setTasks((previous) => [...previous, normalizeTask(created)]);
      }
      closeTaskModal();
    } catch (error) {
      console.error('Failed saving task', error);
      setFormError('Unable to save task. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((previous) => previous.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Unable to delete task', error);
      alert('Task deletion failed.');
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      <main className="ml-56 pt-16 p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              My Tasks
            </h1>
            <p className="text-gray-600">Track and manage all tasks assigned to you</p>
          </div>
          <button onClick={openAddTaskModal} className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
          >
            <option value="all">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          <select
            value={dueDateFilter}
            onChange={(event) => setDueDateFilter(event.target.value as DueDateFilter)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
          >
            {(['all', 'today', 'upcoming', 'overdue', 'no-date'] as DueDateFilter[]).map((option) => (
              <option key={option} value={option}>
                {dueDateLabels[option]}
              </option>
            ))}
          </select>

          <div ref={priorityMenuRef} className="relative">
            <button
              onClick={() => {
                setIsPriorityMenuOpen((previous) => !previous);
                setIsSortMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              {priorityLabels[priorityFilter]}
              <ChevronDown className={`w-4 h-4 transition-transform ${isPriorityMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPriorityMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-20">
                {(['all', 'High', 'Medium', 'Low'] as PriorityFilter[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setPriorityFilter(option);
                      setIsPriorityMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      priorityFilter === option ? 'bg-[#204EA7]/10 text-[#204EA7]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {priorityLabels[option]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={sortMenuRef} className="relative">
            <button
              onClick={() => {
                setIsSortMenuOpen((previous) => !previous);
                setIsPriorityMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              {sortLabels[sortBy]}
              <ChevronDown className={`w-4 h-4 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-20">
                {(['default', 'title-asc', 'due-asc', 'priority-desc'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      sortBy === option ? 'bg-[#204EA7]/10 text-[#204EA7]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {sortLabels[option]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter((task) => task.status !== 'Done').length}
            </div>
            <div className="text-sm text-gray-600">Active Tasks</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter((task) => task.status === 'In Progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter((task) => task.dueDate === 'Today').length}
            </div>
            <div className="text-sm text-gray-600">Due Today</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter((task) => task.status === 'Done').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Task Name</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Project</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Priority</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getTaskProjectName(task) === 'Standalone' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100">
                          Standalone
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">{getTaskProjectName(task)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
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
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button onClick={() => openEditTaskModal(task)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-gray-100 rounded text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading || isSearchLoading ? (
            <div className="p-12 text-center text-gray-500">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                No tasks found
              </h3>
              <p className="text-gray-600">Try adjusting your search, filters, or sorting.</p>
            </div>
          ) : null}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Task' : 'Create Task'}</h2>
                <button onClick={closeTaskModal} className="text-gray-400 hover:text-gray-700">X</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Title</label>
                  <input
                    value={taskForm.title}
                    onChange={(event) => setTaskForm((previous) => ({ ...previous, title: event.target.value }))}
                    placeholder="Task title"
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    name="title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    value={taskForm.project_id}
                    onChange={(event) => setTaskForm((previous) => ({ ...previous, project_id: event.target.value }))}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    name="project_id"
                  >
                    <option value={projects.find((project) => project.name === 'Standalone')?.id ?? ''}>Standalone</option>
                    {projects
                      .filter((project) => project.name !== 'Standalone')
                      .map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(event) => setTaskForm((previous) => ({ ...previous, status: event.target.value as Task['status'] }))}
                      name="status"
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(event) => setTaskForm((previous) => ({ ...previous, priority: event.target.value as Task['priority'] }))}
                      name="priority"
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    >
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(event) => setTaskForm((previous) => ({ ...previous, due_date: event.target.value }))}
                      name="due_date"
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    />
                  </div>
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <div className="flex justify-end gap-2 pt-3">
                  <button onClick={closeTaskModal} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">
                    Cancel
                  </button>
                  <button onClick={saveTask} className="px-4 py-2 rounded-lg bg-[#204EA7] text-sm text-white hover:bg-[#1a3d8a]">
                    {isEditMode ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
