import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChevronRight, Plus, MoreVertical, GripVertical, MessageSquare, Calendar as CalendarIcon, CheckSquare, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useApiClient } from '../lib/api-client';

interface ApiTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

const mockColumns: Column[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tasks: [
      {
        id: '1',
        title: 'Create user authentication flow',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'Medium',
        dueDate: 'Mar 15',
        assignees: ['AM', 'JL'],
        comments: 3,
        subtasks: { completed: 2, total: 5 }
      },
      {
        id: '2',
        title: 'Design mobile app wireframes',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Low',
        dueDate: 'Mar 20',
        assignees: ['SC'],
        comments: 1,
        subtasks: { completed: 0, total: 3 }
      }
    ]
  },
  {
    id: 'todo',
    title: 'To Do',
    tasks: [
      {
        id: '3',
        title: 'Update homepage banner images',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'High',
        dueDate: 'Mar 6',
        assignees: ['SJ'],
        comments: 5,
        subtasks: { completed: 1, total: 2 }
      },
      {
        id: '4',
        title: 'Review API documentation',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'Medium',
        dueDate: 'Mar 8',
        assignees: ['AM', 'PW'],
        comments: 2,
        subtasks: { completed: 3, total: 4 }
      },
      {
        id: '5',
        title: 'Set up analytics tracking',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'High',
        dueDate: 'Mar 7',
        assignees: ['JL', 'MK', 'TB'],
        comments: 7,
        subtasks: { completed: 0, total: 6 }
      }
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tasks: [
      {
        id: '6',
        title: 'Implement payment gateway integration',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 5',
        assignees: ['AM'],
        comments: 12,
        subtasks: { completed: 4, total: 8 }
      },
      {
        id: '7',
        title: 'Create responsive navigation menu',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'Medium',
        dueDate: 'Mar 6',
        assignees: ['SJ', 'SC'],
        comments: 4,
        subtasks: { completed: 2, total: 3 }
      }
    ]
  },
  {
    id: 'review',
    title: 'Review',
    tasks: [
      {
        id: '8',
        title: 'User dashboard layout refinements',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Medium',
        dueDate: 'Mar 4',
        assignees: ['SC', 'EM'],
        comments: 8,
        subtasks: { completed: 5, total: 5 }
      },
      {
        id: '9',
        title: 'Database optimization queries',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 5',
        assignees: ['PW'],
        comments: 3,
        subtasks: { completed: 1, total: 4 }
      }
    ]
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [
      {
        id: '10',
        title: 'Initial project setup and configuration',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 1',
        assignees: ['AM', 'PW'],
        comments: 15,
        subtasks: { completed: 8, total: 8 },
        completed: true
      },
      {
        id: '11',
        title: 'Design system color palette',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Medium',
        dueDate: 'Feb 28',
        assignees: ['SC'],
        comments: 6,
        subtasks: { completed: 4, total: 4 },
        completed: true
      }
    ]
  }
];

const teamMembers = [
  { initials: 'SJ', name: 'Sarah Johnson' },
  { initials: 'AM', name: 'Alex Morgan' },
  { initials: 'JL', name: 'Jordan Lee' },
  { initials: 'SC', name: 'Sam Chen' }
];

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
            className="rounded border border-red-700 bg-white p-1 text-red-700 transition-all duration-200 hover:bg-red-700 hover:text-white hover:shadow-sm"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
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

  const normalizeTask = (task: ApiTask): Task => ({
    id: task.id,
    title: task.title,
    project: 'Client Website Redesign', // optionally dynamic if you have project data
    projectColor: '#204EA7',
    priority: task.priority,
    dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A',
    assignees: task.assignee_id ? [task.assignee_id] : [],
    comments: 0,
    subtasks: undefined,
    completed: task.status === 'Done',
    status: task.status,
  });

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const tasks = await api.get<ApiTask[]>('/tasks');
      const columnTasks: Record<string, Task[]> = {
        todo: [],
        'in-progress': [],
        review: [],
        done: [],
      };
      tasks.forEach((task) => {
        const statusKey = task.status === 'To Do' ? 'todo'
          : task.status === 'In Progress' ? 'in-progress'
          : task.status === 'In Review' ? 'review'
          : 'done';
        columnTasks[statusKey].push(normalizeTask(task));
      });
      setColumns((prev) => prev.map((col) => ({ ...col, tasks: columnTasks[col.id] || [] })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFormMode, setTaskFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    status: Task['status'];
    priority: Task['priority'];
    dueDate: string;
    assigneeId: string;
  }>({
    title: '',
    status: 'To Do',
    priority: 'Medium',
    dueDate: '',
    assigneeId: '',
  });

  const openCreateForm = () => {
    console.log('Opening create form');
    setTaskFormMode('create');
    setEditingTask(null);
    setTaskForm({
      title: '',
      status: 'To Do',
      priority: 'Medium',
      dueDate: '',
      assigneeId: '',
    });
    setIsTaskFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setTaskFormMode('edit');
    setEditingTask(task);
    setTaskForm({
      title: task.title,
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
      project_id: 'YOUR_PROJECT_ID',
      title: taskForm.title,
      status: taskForm.status,
      priority: taskForm.priority,
      due_date: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
      assignee_id: taskForm.assigneeId || null,
    };

    try {
      if (taskFormMode === 'create') {
        const created = await api.post<ApiTask>('/tasks', requestBody);
        const statusKey = created.status === 'To Do' ? 'todo' : created.status === 'In Progress' ? 'in-progress' : created.status === 'In Review' ? 'review' : 'done';
        setColumns((prev) => prev.map((col) =>
          col.id === statusKey ? { ...col, tasks: [...col.tasks, normalizeTask(created)] } : col,
        ));
      } else if (editingTask) {
        const updated = await api.patch<ApiTask>(`/tasks/${editingTask.id}`, requestBody);
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

  const handleAddTask = async () => {
    const title = prompt('Task title');
    if (!title) return;

    try {
      const newTask = await api.post<ApiTask>('/tasks', {
        project_id: '<<your-project-id>>',
        title,
        status: 'To Do',
        priority: 'Medium',
      });
      setColumns((prev) => prev.map((col) =>
        col.id === 'todo' ? { ...col, tasks: [...col.tasks, normalizeTask(newTask)] } : col
      ));
    } catch (error) {
      console.error('Create task failed:', error);
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
            <span className="text-gray-900 font-medium">Client Website Redesign</span>
          </div>

          {/* Project Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Client Website Redesign
                </h1>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                  <div className="flex items-center -space-x-2">
                    {teamMembers.map((member, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                        title={member.name}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                  <input
                    name="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Task title"
                    className="w-full border border-gray-300 rounded p-2"
                  />
                  <select
                    name="status"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value as Task['status'] }))}
                    className="w-full border border-gray-300 rounded p-2"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Done">Done</option>
                  </select>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                    className="w-full border border-gray-300 rounded p-2"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <input
                    name="dueDate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded p-2"
                  />
                  <input
                    name="assigneeId"
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}
                    placeholder="Assignee user id"
                    className="w-full border border-gray-300 rounded p-2"
                  />
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
