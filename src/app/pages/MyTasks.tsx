import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, ChevronDown, Plus, Calendar, AlertCircle, CheckCircle2, Circle, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: string;
  name: string;
  project: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  assignee: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    name: 'Design new landing page layout',
    project: 'Website Redesign',
    priority: 'High',
    dueDate: 'Today',
    status: 'In Progress',
    assignee: 'SJ'
  },
  {
    id: '2',
    name: 'Review authentication module PR',
    project: 'Mobile App Launch',
    priority: 'High',
    dueDate: 'Today',
    status: 'To Do',
    assignee: 'SJ'
  },
  {
    id: '3',
    name: 'Update API documentation',
    project: 'API Documentation',
    priority: 'Medium',
    dueDate: 'Tomorrow',
    status: 'In Progress',
    assignee: 'SJ'
  },
  {
    id: '4',
    name: 'Create user flow diagrams',
    project: 'Customer Portal',
    priority: 'Medium',
    dueDate: 'Mar 8',
    status: 'To Do',
    assignee: 'SJ'
  },
  {
    id: '5',
    name: 'Setup CI/CD pipeline',
    project: 'Mobile App Launch',
    priority: 'High',
    dueDate: 'Mar 10',
    status: 'In Review',
    assignee: 'SJ'
  },
  {
    id: '6',
    name: 'Fix navigation menu bug',
    project: 'Website Redesign',
    priority: 'Low',
    dueDate: 'Mar 12',
    status: 'To Do',
    assignee: 'SJ'
  },
  {
    id: '7',
    name: 'Conduct usability testing',
    project: 'Customer Portal',
    priority: 'Medium',
    dueDate: 'Mar 15',
    status: 'To Do',
    assignee: 'SJ'
  },
  {
    id: '8',
    name: 'Write release notes',
    project: 'Q4 Marketing Campaign',
    priority: 'Low',
    dueDate: 'Feb 28',
    status: 'Done',
    assignee: 'SJ'
  }
];

export function MyTasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.project.toLowerCase().includes(searchQuery.toLowerCase());
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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
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
              {mockTasks.filter(t => t.status !== 'Done').length}
            </div>
            <div className="text-sm text-gray-600">Active Tasks</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {mockTasks.filter(t => t.status === 'In Progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {mockTasks.filter(t => t.dueDate === 'Today').length}
            </div>
            <div className="text-sm text-gray-600">Due Today</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {mockTasks.filter(t => t.status === 'Done').length}
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
                      <div className="font-medium text-gray-900">{task.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{task.project}</span>
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
                    <td className="px-6 py-4">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                No tasks found
              </h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
