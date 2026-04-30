import { AlertCircle, Calendar } from 'lucide-react';
import { useState } from 'react';

interface AssignedTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  status: 'todo' | 'in_progress' | 'done';
  project?: {
    id: string;
    name: string;
    color?: string;
  };
}

interface AssignedToMeProps {
  tasks: AssignedTask[];
  loading?: boolean;
}

const sampleAssignedTasks: AssignedTask[] = [
  {
    id: '1',
    title: 'Implement user profile settings page',
    priority: 'high',
    due_date: '2026-03-05',
    status: 'in_progress',
    project: { id: '1', name: 'Frontend', color: '#DC2626' }
  },
  {
    id: '2',
    title: 'Write unit tests for authentication service',
    priority: 'high',
    due_date: '2026-03-06',
    status: 'todo',
    project: { id: '2', name: 'Backend', color: '#16A34A' }
  },
  {
    id: '3',
    title: 'Update API documentation',
    priority: 'medium',
    due_date: '2026-03-08',
    status: 'in_progress',
    project: { id: '3', name: 'Documentation', color: '#9333EA' }
  },
  {
    id: '4',
    title: 'Review pull request for dashboard redesign',
    priority: 'medium',
    due_date: '2026-03-10',
    status: 'todo',
    project: { id: '4', name: 'Frontend', color: '#DC2626' }
  },
  {
    id: '5',
    title: 'Optimize database queries for reports',
    priority: 'low',
    due_date: '2026-03-12',
    status: 'todo',
    project: { id: '5', name: 'Backend', color: '#16A34A' }
  },
  {
    id: '6',
    title: 'Create wireframes for mobile app',
    priority: 'high',
    due_date: '2026-03-07',
    status: 'in_progress',
    project: { id: '6', name: 'Design', color: 'var(--accent)' }
  }
];

export function AssignedToMe({ tasks, loading = false }: AssignedToMeProps) {
  const [activeStatus, setActiveStatus] = useState('all');

  // Use provided tasks or fallback to sample
  const displayTasks = tasks.length > 0 ? tasks : sampleAssignedTasks;

  const statusFilters = [
    { id: 'all', label: 'All', count: displayTasks.length },
    { id: 'in_progress', label: 'In Progress', count: displayTasks.filter(t => t.status === 'in_progress').length },
    { id: 'todo', label: 'Pending', count: displayTasks.filter(t => t.status === 'todo').length },
    { id: 'done', label: 'Done', count: displayTasks.filter(t => t.status === 'done').length }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'medium':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'low':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      default:
        return { bg: 'bg-surface-hover', text: 'text-text-secondary' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { bg: 'bg-accent/10', text: 'text-accent' };
      case 'todo':
        return { bg: 'bg-surface-hover', text: 'text-text-secondary' };
      case 'done':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      default:
        return { bg: 'bg-surface-hover', text: 'text-text-secondary' };
    }
  };

  const filteredTasks = activeStatus === 'all' 
    ? displayTasks 
    : displayTasks.filter(task => task.status === activeStatus);

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-divider flex flex-col" style={{ height: '520px' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-divider">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
          Assigned to Me
        </h2>

        {/* Status Badge Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveStatus(filter.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStatus === filter.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {filter.label}
              <span className={`ml-1.5 ${activeStatus === filter.id ? 'opacity-80' : 'opacity-60'}`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table Header */}
      <div className="flex-shrink-0 grid grid-cols-12 gap-4 px-6 py-3 border-b border-divider bg-surface-sunken">
        <div className="col-span-6">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Task Name</span>
        </div>
        <div className="col-span-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</span>
        </div>
        <div className="col-span-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Due Date</span>
        </div>
      </div>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-text-tertiary">Loading assigned tasks...</div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityColors = getPriorityColor(task.priority);
            const statusColors = getStatusColor(task.status);

            return (
              <div
                key={task.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-surface-sunken transition-colors cursor-pointer border-b border-divider last:border-b-0"
              >
                <div className="col-span-6 flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    {task.title}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${statusColors.bg} ${statusColors.text}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-3 flex items-start">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${priorityColors.bg} ${priorityColors.text} capitalize`}>
                    {task.priority === 'high' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {task.priority}
                  </span>
                </div>
                <div className="col-span-3 flex items-start">
                  <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
