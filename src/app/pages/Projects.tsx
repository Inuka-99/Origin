import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, ChevronDown, Plus, Grid3x3, List, Users, Calendar, MoreVertical, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  status: 'Active' | 'Completed' | 'On Hold';
  team: string[];
  lastUpdated: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Complete overhaul of company website with new branding and improved UX',
    progress: 65,
    tasksTotal: 28,
    tasksCompleted: 18,
    status: 'Active',
    team: ['SJ', 'AM', 'JL', 'SC'],
    lastUpdated: '2 hours ago'
  },
  {
    id: '2',
    name: 'Mobile App Launch',
    description: 'Development and launch of iOS and Android mobile applications',
    progress: 45,
    tasksTotal: 42,
    tasksCompleted: 19,
    status: 'Active',
    team: ['AM', 'JL', 'MK'],
    lastUpdated: '5 hours ago'
  },
  {
    id: '3',
    name: 'Q4 Marketing Campaign',
    description: 'Strategic marketing initiatives for Q4 product launches',
    progress: 100,
    tasksTotal: 15,
    tasksCompleted: 15,
    status: 'Completed',
    team: ['SC', 'EM', 'RH'],
    lastUpdated: '1 day ago'
  },
  {
    id: '4',
    name: 'Customer Portal',
    description: 'Self-service portal for customer account management',
    progress: 30,
    tasksTotal: 35,
    tasksCompleted: 11,
    status: 'Active',
    team: ['JL', 'AM', 'PW', 'TB'],
    lastUpdated: '3 hours ago'
  },
  {
    id: '5',
    name: 'Security Audit',
    description: 'Comprehensive security review and implementation of improvements',
    progress: 0,
    tasksTotal: 12,
    tasksCompleted: 0,
    status: 'On Hold',
    team: ['MK', 'TB'],
    lastUpdated: '1 week ago'
  },
  {
    id: '6',
    name: 'API Documentation',
    description: 'Complete API documentation and developer guides',
    progress: 80,
    tasksTotal: 10,
    tasksCompleted: 8,
    status: 'Active',
    team: ['AM', 'PW'],
    lastUpdated: '1 day ago'
  }
];

export function Projects() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = mockProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Completed':
        return 'bg-blue-100 text-blue-700';
      case 'On Hold':
        return 'bg-gray-100 text-gray-700';
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
              Projects
            </h1>
            <p className="text-gray-600">Manage and track all active projects</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Create Project
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Sort */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
            Sort
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
            >
              <Grid3x3 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
            >
              <List className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid3x3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              No projects found
            </h3>
            <p className="text-gray-600 mb-6">Create your first project to start tracking work</p>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate('/project-board')}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-[#204EA7]/20"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                      {project.name}
                    </h3>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#204EA7] transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>{project.tasksCompleted}/{project.tasksTotal} tasks</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center -space-x-2">
                    {project.team.map((member, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                      >
                        {member}
                      </div>
                    ))}
                    {project.team.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                        +{project.team.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {project.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Project</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Progress</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Tasks</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Team</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Last Updated</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-600 truncate max-w-xs">{project.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#204EA7]"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {project.tasksCompleted}/{project.tasksTotal}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center -space-x-2">
                          {project.team.slice(0, 3).map((member, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                            >
                              {member}
                            </div>
                          ))}
                          {project.team.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                              +{project.team.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{project.lastUpdated}</td>
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
          </div>
        )}
      </main>
    </div>
  );
}