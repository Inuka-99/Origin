import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Filter, ChevronDown, Plus, Grid3x3, List, Users, Calendar, MoreVertical, CheckSquare, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useProjects, useProjectMembers, type Project as ApiProject } from '../lib/useProjects';

interface Project extends ApiProject {
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
  const { projects: apiProjects, loading, error, createProject, updateProject, deleteProject } = useProjects();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const { members, loading: membersLoading, addMember, removeMember } = useProjectMembers(selectedProject?.id || '');

  // Convert API projects to display format with placeholder stats
  const projects: Project[] = apiProjects.map(apiProject => ({
    ...apiProject,
    progress: 0, // TODO: Calculate from tasks
    tasksTotal: 0, // TODO: Fetch from tasks API
    tasksCompleted: 0, // TODO: Fetch from tasks API
    status: 'Active' as const, // TODO: Determine from project state
    team: [], // TODO: Get from members
    lastUpdated: new Date(apiProject.updated_at).toLocaleDateString(),
  }));

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    try {
      setCreating(true);
      await createProject(data);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium"
          >
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
        {loading ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[#204EA7] mx-auto mb-4" />
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-lg p-6 text-center shadow-sm">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
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
                onClick={() => {
                  setSelectedProject(project);
                  setShowMembersModal(true);
                }}
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Create New Project
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                if (name.trim()) {
                  handleCreateProject({ name: name.trim(), description: description.trim() || undefined });
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  placeholder="Enter project description (optional)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Members Modal */}
      {showMembersModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {selectedProject.name}
                </h2>
                <p className="text-gray-600 text-sm mt-1">{selectedProject.description}</p>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Project Members</h3>
              
              {/* Add Member Form */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Add Member</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const userId = formData.get('userId') as string;
                    const role = formData.get('role') as string;
                    if (userId.trim()) {
                      addMember(userId.trim(), role as 'admin' | 'member' || 'member');
                      (e.target as HTMLFormElement).reset();
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    name="userId"
                    placeholder="User ID (Auth0 ID)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                    required
                  />
                  <select
                    name="role"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </form>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#204EA7]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#204EA7] flex items-center justify-center text-white font-semibold">
                          {member.profiles?.full_name?.charAt(0) || member.user_id.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{member.profiles?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-600">{member.profiles?.email || member.user_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.role}
                        </span>
                        <button
                          onClick={() => removeMember(member.user_id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No members yet</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMembersModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}