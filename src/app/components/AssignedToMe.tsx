import { AlertCircle, Calendar } from 'lucide-react';
import { useState } from 'react';

interface AssignedTask {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'in-progress' | 'pending' | 'review';
}

const assignedTasks: AssignedTask[] = [
  {
    id: '1',
    name: 'Implement user profile settings page',
    priority: 'high',
    dueDate: 'Mar 5, 2026',
    status: 'in-progress'
  },
  {
    id: '2',
    name: 'Write unit tests for authentication service',
    priority: 'high',
    dueDate: 'Mar 6, 2026',
    status: 'pending'
  },
  {
    id: '3',
    name: 'Update API documentation',
    priority: 'medium',
    dueDate: 'Mar 8, 2026',
    status: 'in-progress'
  },
  {
    id: '4',
    name: 'Review pull request for dashboard redesign',
    priority: 'medium',
    dueDate: 'Mar 10, 2026',
    status: 'review'
  },
  {
    id: '5',
    name: 'Optimize database queries for reports',
    priority: 'low',
    dueDate: 'Mar 12, 2026',
    status: 'pending'
  },
  {
    id: '6',
    name: 'Create wireframes for mobile app',
    priority: 'high',
    dueDate: 'Mar 7, 2026',
    status: 'in-progress'
  }
];

export function AssignedToMe() {
  const [activeStatus, setActiveStatus] = useState('all');

  const statusFilters = [
    { id: 'all', label: 'All', count: 6 },
    { id: 'in-progress', label: 'In Progress', count: 3 },
    { id: 'pending', label: 'Pending', count: 2 },
    { id: 'review', label: 'Review', count: 1 }
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
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return { bg: 'bg-[#204EA7]/10', text: 'text-[#204EA7]' };
      case 'pending':
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
      case 'review':
        return { bg: 'bg-purple-100', text: 'text-purple-700' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const filteredTasks = activeStatus === 'all' 
    ? assignedTasks 
    : assignedTasks.filter(task => task.status === activeStatus);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col" style={{ height: '520px' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
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
                  ? 'bg-[#204EA7] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
      <div className="flex-shrink-0 grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="col-span-6">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Task Name</span>
        </div>
        <div className="col-span-3">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</span>
        </div>
        <div className="col-span-3">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</span>
        </div>
      </div>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.map((task) => {
          const priorityColors = getPriorityColor(task.priority);
          const statusColors = getStatusColor(task.status);

          return (
            <div
              key={task.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="col-span-6 flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-900">
                  {task.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${statusColors.bg} ${statusColors.text}`}>
                  {task.status.replace('-', ' ')}
                </span>
              </div>
              <div className="col-span-3 flex items-start">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${priorityColors.bg} ${priorityColors.text} capitalize`}>
                  {task.priority === 'high' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {task.priority}
                </span>
              </div>
              <div className="col-span-3 flex items-start">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {task.dueDate}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
