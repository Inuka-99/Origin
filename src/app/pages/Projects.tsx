import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  ChevronDown,
  Filter,
  Grid3x3,
  List,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useNavigate } from 'react-router';
import { Search, Filter, ChevronDown, Plus, Grid3x3, List, Users, Calendar, MoreVertical, CheckSquare, Loader2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProjects, useProjectMembers, type Project as ApiProject, type ProjectMember } from '../lib/useProjects';
import { useAuthUser } from '../auth/useAuthUser';
import { useApiClient } from '../lib/api-client';

interface Project extends ApiProject {
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  status: 'Active' | 'Completed' | 'On Hold';
  team: string[];
  lastUpdated: string;
  user_role?: 'admin' | 'member' | null;
}


const formControlClassName =
  'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-[border-color,box-shadow] hover:border-gray-400 hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const textAreaClassName =
  'min-h-24 rounded-md border border-gray-300 bg-white shadow-sm transition-[border-color,box-shadow] hover:border-gray-400 hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export function Projects() {
  const navigate = useNavigate();
  const { projects: apiProjects, loading, error, createProject, updateProject, deleteProject, refetch } = useProjects();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [memberRemovalConfirmation, setMemberRemovalConfirmation] = useState<{
    userId: string;
    userName: string;
    isLastMember: boolean;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const { members, loading: membersLoading, addMember, removeMember } = useProjectMembers(selectedProject?.id || '');
  const { user } = useAuthUser();
  const api = useApiClient();
  const [projectTasks, setProjectTasks] = useState<Record<string, any[]>>({});
  const [tasksLoading, setTasksLoading] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Fetch tasks for all projects
  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (apiProjects.length === 0) return;

      setTasksLoading(true);
      try {
        const tasksMap: Record<string, any[]> = {};

        // Fetch tasks for each project in parallel
        const taskPromises = apiProjects.map(async (project) => {
          try {
            const tasks = await api.get(`/tasks/project/${project.id}`);
            return { projectId: project.id, tasks };
          } catch (err) {
            console.error(`Failed to fetch tasks for project ${project.id}:`, err);
            return { projectId: project.id, tasks: [] };
          }
        });

        const results = await Promise.all(taskPromises);

        results.forEach(({ projectId, tasks }) => {
          tasksMap[projectId] = tasks;
        });

        setProjectTasks(tasksMap);
      } catch (err) {
        console.error('Failed to fetch project tasks:', err);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchProjectTasks();
  }, [apiProjects, api]);

  // Convert API projects to display format with calculated stats
  const projects: Project[] = apiProjects.map(apiProject => {
    const tasks = projectTasks[apiProject.id] || [];
    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter(task => task.status === 'Done').length;
    const progress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

    return {
      ...apiProject,
      progress,
      tasksTotal,
      tasksCompleted,
      status: 'Active' as const, // TODO: Determine from project state
      team: [], // TODO: Get from members
      lastUpdated: new Date(apiProject.updated_at).toLocaleDateString(),
    };
  });

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

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    try {
      setDeleting(true);
      await deleteProject(selectedProject.id);
      setShowDeleteModal(false);
      setSelectedProject(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  const isProjectAdmin = (project: Project) => {
    return project.user_role === 'admin';
  };

  const performRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;

    try {
      await removeMember(memberId);
      await refetch();

      // Refresh tasks after member removal
      const updatedTasks = await api.get(`/tasks/project/${selectedProject.id}`);
      setProjectTasks(prev => ({
        ...prev,
        [selectedProject.id]: updatedTasks
      }));

      const removedSelf = memberId === user?.sub;
      const wasLastMember = memberRemovalConfirmation?.isLastMember;
      if (removedSelf || wasLastMember) {
        setShowMembersModal(false);
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setMemberRemovalConfirmation(null);
    }
  };

  const handleRemoveMember = (member: ProjectMember) => {
    if (!selectedProject) return;

    const isLastMember = members.length === 1;
    if (isLastMember) {
      setMemberRemovalConfirmation({
        userId: member.user_id,
        userName: member.profiles?.full_name || member.user_id,
        isLastMember: true,
      });
      return;
    }

    performRemoveMember(member.user_id);
  };

  const cancelMemberRemoval = () => setMemberRemovalConfirmation(null);

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

      <main className="ml-56 pt-16 p-8">
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

        <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
            />
          </div>

          <button type="button" className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-4 h-4" />
          </button>

          <button type="button" className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed">
            Sort
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
            >
              <Grid3x3 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              type="button"
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
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProject(project);
                  setShowMembersModal(true);
                }}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-[#204EA7]/20"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {project.name}
                    </h3>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === project.id ? null : project.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {dropdownOpen === project.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                            setShowMembersModal(true);
                            setDropdownOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Manage Members
                        </button>
                        {isProjectAdmin(project) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setShowDeleteModal(true);
                              setDropdownOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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

                <p className="text-sm text-gray-600 mb-4 min-h-10">
                  {project.description || 'No description has been added yet.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {formatCreated(project.updated_at)}
                  </span>
                  <span>Created {formatCreated(project.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Project</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Description</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Created By</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Created</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
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
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(dropdownOpen === project.id ? null : project.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>
                          {dropdownOpen === project.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowMembersModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                              >
                                <Users className="w-4 h-4" />
                                Manage Members
                              </button>
                              {isProjectAdmin(project) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProject(project);
                                    setShowDeleteModal(true);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Project
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-sm truncate">{project.description || 'No description'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{project.created_by || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatCreated(project.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatCreated(project.updated_at)}</td>
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
                          onClick={() => handleRemoveMember(member)}
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

      {memberRemovalConfirmation && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-700 font-bold">!</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Confirm Project Deletion
                </h2>
                <p className="text-gray-600 text-sm">
                  Removing the last member will delete the project <span className="font-semibold">"{selectedProject.name}"</span> permanently.
                </p>
              </div>
            </div>

            <div className="mb-6 text-gray-700">
              <p>
                Are you sure you want to remove <span className="font-semibold">{memberRemovalConfirmation.userName}</span> from this project?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This action cannot be undone and the project will be deleted if there are no remaining members.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelMemberRemoval}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performRemoveMember(memberRemovalConfirmation.userId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Delete Project
                </h2>
                <p className="text-gray-600 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <span className="font-semibold">"{selectedProject.name}"</span>?
              </p>
              <p className="text-sm text-gray-600">
                This will permanently delete the project and all associated tasks, members, and data. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
