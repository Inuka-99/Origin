import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, ChevronDown, Plus, Calendar, AlertCircle, CheckCircle2, Circle, Trash2, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApiClient } from '../lib/api-client';

interface Task {
  id: string;
  title: string;
  project: string;
  projectId: string | null;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  assignee: string;
}

type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: 'todo' | 'in_progress' | 'In Review' | 'Done';
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
};

export function MyTasks() {
  const api = useApiClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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

  const normalizeTask = (task: ApiTask): Task => ({
    id: task.id,
    title: task.title,
    project: task.project_id ? task.project_id : 'Standalone',
    projectId: task.project_id ?? null,
    priority: (task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)) as Task['priority'] || 'Medium',
    dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date',
    status: ({ todo: 'To Do', in_progress: 'In Progress', 'In Review': 'In Review', 'Done': 'Done' } as Record<string, Task['status']>)[task.status] ?? 'To Do',
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
      setTasks(data.map(normalizeTask));
    } catch (error) {
      console.error('Failed to load tasks', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      let data = await api.get<{id:string;name:string}[]>('/projects');

      // Ensure a fallback project named Standalone exists so tasks never save without a valid project_id.
      const standaloneProject = data?.find((p) => p.name === 'Standalone');
      if (!standaloneProject) {
        const createdStandalone = await api.post<{id:string;name:string}>('/projects', { name: 'Standalone' });
        data = [createdStandalone, ...(data ?? [])];
      }

      setProjects(data ?? []);

      if (!taskForm.project_id && (data?.length ?? 0) > 0) {
        setTaskForm((prev) => ({ ...prev, project_id: data![0].id }));
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

  const filteredTasks = tasks.filter(task => {
    const projectName = getTaskProjectName(task);
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

    const assignedProjectId = task.projectId ? task.projectId : projects.find((p) => p.name === 'Standalone')?.id ?? '';

    setTaskForm({
      title: task.title,
      project_id: assignedProjectId,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate === 'No due date' ? '' : new Date(task.dueDate).toISOString().slice(0, 10),
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

    const standaloneProject = projects.find((p) => p.name === 'Standalone');
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
        setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? normalizeTask(updated) : t)));
      } else {
        const created = await api.post<ApiTask>('/tasks', payload);
        setTasks((prev) => [...prev, normalizeTask(created)]);
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
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
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

      {/* Main Content */}
      <main className="ml-56 pt-16 p-8">
        {/* Header */}
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

        {/* Controls Bar */}
        <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
          >
            <option value="all">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          {/* Priority Filter */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" />
            Priority
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Sort */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
            Sort
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter(t => t.status !== 'Done').length}
            </div>
            <div className="text-sm text-gray-600">Active Tasks</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter(t => t.status === 'In Progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter(t => t.dueDate === 'Today').length}
            </div>
            <div className="text-sm text-gray-600">Due Today</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {tasks.filter(t => t.status === 'Done').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        {/* Tasks Table */}
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

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                You have no tasks
              </h3>
              <p className="text-gray-600">Create a task or join a project with tasks.</p>
            </div>
          ) : null}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Task' : 'Create Task'}</h2>
                <button onClick={closeTaskModal} className="text-gray-400 hover:text-gray-700">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Title</label>
                  <input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Task title"
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    name="title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    value={taskForm.project_id}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, project_id: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    name="project_id"
                  >
                    {/* single standalone option + rest of user projects */}
                    <option value={projects.find((p) => p.name === 'Standalone')?.id ?? ''}>Standalone</option>
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
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value as Task['status'] }))}
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
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))}
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
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))}
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
