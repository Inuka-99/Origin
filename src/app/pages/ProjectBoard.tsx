import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChevronRight, Plus, MoreVertical, GripVertical, MessageSquare, Calendar as CalendarIcon, CheckSquare, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useApiClient } from '../lib/api-client';
import { useTaskRealtime } from '../lib/use-task-realtime';

interface ApiTask {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'In Review' | 'Done';
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiProject {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project: string;
  projectColor: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  assignees: string[];
  comments: number;
  subtasks?: { completed: number; total: number };
  completed?: boolean;
  status?: 'To Do' | 'In Progress' | 'In Review' | 'Done';
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const ItemTypes = {
  CARD: 'card',
};

const statusColumns: { id: Column['id']; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

const statusMap: Record<string, Task['status']> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  done: 'Done',
};

const PROJECT_COLORS = ['#204EA7', '#16A34A', '#9333EA', '#DC2626', '#D97706', '#0891B2', '#DB2777', '#059669'];

interface TaskCardProps {
  task: Task;
  columnId: string;
  onMoveTask: (taskId: string, fromColumn: string, toColumn: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

function TaskCard({ task, columnId, onMoveTask, onDeleteTask, onEditTask }: TaskCardProps) {
  const dragRef = useRef<HTMLDivElement | null>(null);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { id: task.id, columnId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  useEffect(() => {
    if (dragRef.current) {
      drag(dragRef.current);
    }
  }, [drag]);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div
      ref={dragRef}
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        task.completed ? 'opacity-60' : ''
      } ${isDragging ? 'opacity-50 shadow-xl scale-105' : ''}`}
      style={{ transition: 'all 0.2s ease' }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium mb-2 ${task.completed ? 'line-through' : 'text-gray-900'}`}>
            {task.title}
          </h4>

          {/* Project Tag */}
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2"
            style={{
              backgroundColor: `${task.projectColor}15`,
              color: task.projectColor
            }}
          >
            {task.project}
          </span>

          {/* Priority & Due Date */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <CalendarIcon className="w-3 h-3" />
              {task.dueDate}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                {task.assignees.map((assignee, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  >
                    {assignee}
                  </div>
                ))}
              </div>
              {task.subtasks && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {task.subtasks.completed}/{task.subtasks.total}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3.5 h-3.5" />
              {task.comments}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            className="p-1 hover:bg-blue-100 rounded"
            title="Edit task"
          >
            <MoreVertical className="w-4 h-4 text-blue-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task.id);
            }}
            className="p-1 hover:bg-red-100 rounded"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: Column;
  onMoveTask: (taskId: string, fromColumn: string, toColumn: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

function KanbanColumn({ column, onMoveTask, onDeleteTask, onEditTask }: KanbanColumnProps) {
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item: { id: string; columnId: string }) => {
      if (item.columnId !== column.id) {
        onMoveTask(item.id, item.columnId, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current);
    }
  }, [drop]);

  const isActive = isOver && canDrop;

  return (
    <div
      ref={dropRef}
      className={`w-80 bg-gray-50 rounded-lg p-4 flex flex-col transition-all ${
        isActive ? 'ring-2 ring-[#204EA7] ring-opacity-50 bg-[#204EA7]/5' : ''
      }`}
      style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {column.title}
          </h3>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Task Cards - Scrollable */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-1 kanban-scrollbar">
        {column.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-sm text-gray-400 mb-4">No tasks in this stage</p>
            <button className="flex items-center gap-2 px-3 py-2 text-[#204EA7] text-sm font-medium hover:bg-[#204EA7]/5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        ) : (
          column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              onMoveTask={onMoveTask}
              onDeleteTask={(taskId) => {
                onDeleteTask(taskId);
              }}
              onEditTask={onEditTask}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ProjectBoard() {
  const api = useApiClient();
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in-progress', title: 'In Progress', tasks: [] },
    { id: 'review', title: 'In Review', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const projectColorMap = new Map<string, string>(projects.map((p, i) => [p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]]));

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get<ApiProject[]>('/projects');
      setProjects(data ?? []);
      return data ?? [];
    } catch (err) {
      console.error('Failed to load projects', err);
      return [];
    }
  }, [api]);

  const loadTasks = useCallback(async (loadedProjects?: ApiProject[]) => {
    try {
      setIsLoading(true);
      const resolvedProjects = loadedProjects ?? projects;
      const resolvedColorMap = new Map<string, string>(resolvedProjects.map((p, i) => [p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]]));
      const tasks = await api.get<ApiTask[]>('/tasks');
      const columnTasks: Record<string, Task[]> = {
        todo: [],
        'in-progress': [],
        review: [],
        done: [],
      };
      tasks.forEach((task) => {
        const projectName = task.project_id ? (resolvedProjects.find((p) => p.id === task.project_id)?.name ?? 'Unknown') : 'Standalone';
        const projectColor = task.project_id ? (resolvedColorMap.get(task.project_id) ?? '#204EA7') : '#6B7280';
        const priority = (task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium') as Task['priority'];
        const dbToDisplay: Record<string, Task['status']> = {
          todo: 'To Do',
          in_progress: 'In Progress',
          'In Review': 'In Review',
          'Done': 'Done',
        };
        const displayStatus = dbToDisplay[task.status] ?? 'To Do';
        const normalized: Task = {
          id: task.id,
          title: task.title,
          project: projectName,
          projectColor,
          priority,
          dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A',
          assignees: task.assigned_to ? [task.assigned_to.slice(0, 2).toUpperCase()] : [],
          comments: 0,
          subtasks: undefined,
          completed: task.status === 'Done',
          status: displayStatus,
        };
        const statusKey = task.status === 'todo' ? 'todo'
          : task.status === 'in_progress' ? 'in-progress'
          : task.status === 'In Review' ? 'review'
          : 'done';
        columnTasks[statusKey].push(normalized);
      });
      setColumns((prev) => prev.map((col) => ({ ...col, tasks: columnTasks[col.id] ?? [] })));
    } finally {
      setIsLoading(false);
    }
  }, [api, projects]);

  useEffect(() => {
    void loadProjects().then((loaded) => void loadTasks(loaded));
  }, [loadProjects, loadTasks]);

  const refreshTasks = useCallback(() => {
    void loadTasks();
  }, [loadTasks]);

  useTaskRealtime({
    onCreated: refreshTasks,
    onUpdated: refreshTasks,
    onDeleted: refreshTasks,
  });

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFormMode, setTaskFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    project_id: string;
    status: Task['status'];
    priority: Task['priority'];
    dueDate: string;
    assigneeId: string;
  }>({
    title: '',
    project_id: '',
    status: 'To Do',
    priority: 'Medium',
    dueDate: '',
    assigneeId: '',
  });

  const openCreateForm = () => {
    setTaskFormMode('create');
    setEditingTask(null);
    setTaskForm({
      title: '',
      project_id: projects[0]?.id ?? '',
      status: 'To Do',
      priority: 'Medium',
      dueDate: '',
      assigneeId: '',
    });
    setIsTaskFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    const matchedProject = projects.find((p) => p.name === task.project);
    setTaskFormMode('edit');
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      project_id: matchedProject?.id ?? projects[0]?.id ?? '',
      status: task.status ?? 'To Do',
      priority: task.priority,
      dueDate: task.dueDate === 'N/A' ? '' : task.dueDate,
      assigneeId: task.assignees[0] ?? '',
    });
    setIsTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setIsTaskFormOpen(false);
  };

  const submitTaskForm = async () => {
    if (!taskForm.title.trim()) {
      alert('Please enter a task title.');
      return;
    }

    const requestBody = {
      project_id: taskForm.project_id || null,
      title: taskForm.title,
      status: taskForm.status,
      priority: taskForm.priority,
      due_date: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
      assigned_to: taskForm.assigneeId || null,
    };

    try {
      if (taskFormMode === 'create') {
        const created = await api.post<ApiTask>('/tasks', requestBody);
        const statusKey = created.status === 'todo' ? 'todo' : created.status === 'in_progress' ? 'in-progress' : created.status === 'In Review' ? 'review' : 'done';
        const projectName = created.project_id ? (projects.find((p) => p.id === created.project_id)?.name ?? 'Unknown') : 'Standalone';
        const projectColor = created.project_id ? (projectColorMap.get(created.project_id) ?? '#204EA7') : '#6B7280';
        const priority = (created.priority ? created.priority.charAt(0).toUpperCase() + created.priority.slice(1) : 'Medium') as Task['priority'];
        const newTask: Task = {
          id: created.id,
          title: created.title,
          project: projectName,
          projectColor,
          priority,
          dueDate: created.due_date ? new Date(created.due_date).toLocaleDateString() : 'N/A',
          assignees: created.assigned_to ? [created.assigned_to.slice(0, 2).toUpperCase()] : [],
          comments: 0,
          completed: created.status === 'Done',
          status: ({ todo: 'To Do', in_progress: 'In Progress', 'In Review': 'In Review', 'Done': 'Done' } as Record<string, Task['status']>)[created.status] ?? 'To Do',
        };
        setColumns((prev) => prev.map((col) =>
          col.id === statusKey ? { ...col, tasks: [...col.tasks, newTask] } : col,
        ));
      } else if (editingTask) {
        await api.patch<ApiTask>(`/tasks/${editingTask.id}`, requestBody);
        await loadTasks();
      }
      closeTaskForm();
    } catch (err) {
      console.error('Failed to save task', err);
      alert('Could not save task. Check console.');
    }
  };

  const handleMoveTask = async (taskId: string, fromColumnId: string, toColumnId: string) => {
    const status = statusMap[toColumnId];
    if (!status) return;

    setColumns((prevColumns) => {
      const updated = prevColumns.map((col) => ({ ...col, tasks: [...col.tasks] }));
      const from = updated.find((c) => c.id === fromColumnId);
      const to = updated.find((c) => c.id === toColumnId);
      if (!from || !to) return updated;

      const idx = from.tasks.findIndex((task) => task.id === taskId);
      if (idx === -1) return updated;

      const [task] = from.tasks.splice(idx, 1);
      task.completed = status === 'Done';
      task.status = status;
      to.tasks.push(task);
      return updated;
    });

    try {
      await api.patch(`/tasks/${taskId}`, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
      void loadTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setColumns((prev) => prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((task) => task.id !== taskId),
      })));
    } catch (error) {
      console.error('Delete task failed:', error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#F7F8FA]">
        <Sidebar />
        <TopBar />

        {/* Main Content */}
        <main className="ml-56 pt-16 p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <a href="/projects" className="hover:text-[#204EA7] transition-colors">Projects</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Task Board</span>
          </div>

          {/* Board Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                Task Board
              </h1>
              <p className="text-sm text-gray-500">{isLoading ? 'Loading...' : `${columns.reduce((sum, c) => sum + c.tasks.length, 0)} tasks across ${columns.length} columns`}</p>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
            <button className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg transition-colors">
              Overview
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-[#204EA7] bg-white border-b-2 border-[#204EA7] rounded-t-lg">
              Board
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg transition-colors">
              List
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg transition-colors">
              Calendar
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg transition-colors">
              Activity
            </button>
          </div>

          {/* Task form modal */}
          {isTaskFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {taskFormMode === 'create' ? 'Create Task' : 'Edit Task'}
                  </h2>
                  <button onClick={closeTaskForm} className="text-gray-400 hover:text-gray-600">X</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input
                      name="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    />
                  </div>
                  {projects.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                      <select
                        name="project_id"
                        value={taskForm.project_id}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, project_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        name="status"
                        value={taskForm.status}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value as Task['status'] }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="In Review">In Review</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                    <input
                      name="dueDate"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={closeTaskForm}
                    className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitTaskForm}
                    className="px-4 py-2 text-sm bg-[#204EA7] text-white rounded hover:bg-[#163b74]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Kanban Board */}
          <div className="overflow-x-auto pb-4 kanban-horizontal-scroll">
            <div className="flex gap-4 min-w-max">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  onMoveTask={handleMoveTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={openEditForm}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </DndProvider>
  );
}
