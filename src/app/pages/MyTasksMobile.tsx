import { MobileTopBar } from '../components/MobileTopBar';
import { Search, Plus, Calendar, AlertCircle, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: string;
  name: string;
  project: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
}

const mockTasks: Task[] = [
  {
    id: '1',
    name: 'Design new landing page layout',
    project: 'Website Redesign',
    priority: 'High',
    dueDate: 'Today',
    status: 'In Progress'
  },
  {
    id: '2',
    name: 'Review authentication module PR',
    project: 'Mobile App Launch',
    priority: 'High',
    dueDate: 'Today',
    status: 'To Do'
  },
  {
    id: '3',
    name: 'Update API documentation',
    project: 'API Documentation',
    priority: 'Medium',
    dueDate: 'Tomorrow',
    status: 'In Progress'
  },
  {
    id: '4',
    name: 'Create user flow diagrams',
    project: 'Customer Portal',
    priority: 'Medium',
    dueDate: 'Mar 8',
    status: 'To Do'
  },
  {
    id: '5',
    name: 'Setup CI/CD pipeline',
    project: 'Mobile App Launch',
    priority: 'High',
    dueDate: 'Mar 10',
    status: 'In Review'
  },
  {
    id: '6',
    name: 'Fix navigation menu bug',
    project: 'Website Redesign',
    priority: 'Low',
    dueDate: 'Mar 12',
    status: 'To Do'
  }
];

export function MyTasksMobile() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.project.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || task.status === activeTab;
    return matchesSearch && matchesTab;
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
      <MobileTopBar />

      <main className="pt-14">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                My Tasks
              </h1>
              <p className="text-sm text-gray-600">Track all your tasks</p>
            </div>
            <button className="p-3 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                {mockTasks.filter(t => t.status !== 'Done').length}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                {mockTasks.filter(t => t.dueDate === 'Today').length}
              </div>
              <div className="text-xs text-gray-600">Due Today</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] ${
                activeTab === 'all'
                  ? 'bg-[#204EA7] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('To Do')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] ${
                activeTab === 'To Do'
                  ? 'bg-[#204EA7] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              To Do
            </button>
            <button
              onClick={() => setActiveTab('In Progress')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] ${
                activeTab === 'In Progress'
                  ? 'bg-[#204EA7] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveTab('Done')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] ${
                activeTab === 'Done'
                  ? 'bg-[#204EA7] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Done
            </button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 min-h-[100px]"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {task.name}
                    </h3>
                    <p className="text-xs text-gray-600">{task.project}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>

                {/* Task Details */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status}
                  </span>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className={task.dueDate === 'Today' ? 'text-red-600 font-medium' : ''}>
                    Due {task.dueDate}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                No tasks found
              </h3>
              <p className="text-sm text-gray-600">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
