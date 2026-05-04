/**
 * Admin.tsx
 *
 * Admin panel for managing user roles.
 * Only accessible to users with the 'admin' role.
 * Displays a list of all users with the ability to promote/demote roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Shield, Users, UserCheck, UserX, Search, RefreshCw, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useApiClient, unwrapList, type PaginatedList } from '../lib/api-client';
import {
  getTaskApprovalClasses,
  getTaskApprovalLabel,
  type TaskApprovalStatus,
} from '../lib/task-approval';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

interface PendingApprovalTask {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: string | null;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string | null;
  created_by: string | null;
  approval_status: TaskApprovalStatus;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

export function Admin() {
  const api = useApiClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<UserProfile[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await api.get<ProjectOption[] | PaginatedList<ProjectOption>>('/projects');
      setProjects(unwrapList(response));
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    }
  }, [api]);

  const loadPendingTasks = useCallback(async () => {
    try {
      setPendingLoading(true);
      const response = await api.get<PendingApprovalTask[] | PaginatedList<PendingApprovalTask>>(
        '/tasks?approval_status=pending&limit=100',
      );
      setPendingTasks(unwrapList(response));
    } catch (err) {
      console.error('Failed to load pending tasks:', err);
      setPendingTasks([]);
    } finally {
      setPendingLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void Promise.all([loadUsers(), loadProjects(), loadPendingTasks()]).finally(() => {
      setLoading(false);
    });
  }, [loadPendingTasks, loadProjects, loadUsers]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      setUpdatingId(userId);
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as 'admin' | 'member' } : u)),
      );
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Standalone task';
    return projects.find((project) => project.id === projectId)?.name ?? 'Unknown project';
  };

  const getUserLabel = (userId: string | null) => {
    if (!userId) return 'Unknown user';
    const user = users.find((item) => item.id === userId);
    return user?.full_name || user?.email || user?.id || userId;
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'In Review':
        return 'In Review';
      case 'Done':
      case 'completed':
        return 'Done';
      default:
        return 'To Do';
    }
  };

  const getStatusClasses = (status: string | null) => {
    switch (status) {
      case 'in_progress':
        return 'bg-accent-soft text-blue-600';
      case 'In Review':
        return 'bg-purple-50 text-purple-600';
      case 'Done':
      case 'completed':
        return 'bg-green-50 text-green-600';
      case 'todo':
      default:
        return 'bg-surface-hover text-text-secondary';
    }
  };

  const getPriorityClasses = (priority: PendingApprovalTask['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-600';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700';
      case 'Low':
      default:
        return 'bg-green-50 text-green-600';
    }
  };

  const updateTaskApproval = async (taskId: string, approvalStatus: 'approved' | 'rejected') => {
    try {
      setApprovingTaskId(taskId);
      await api.patch(`/tasks/${taskId}/approval`, { approval_status: approvalStatus });
      setPendingTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error('Failed to update task approval:', err);
    } finally {
      setApprovingTaskId(null);
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const memberCount = users.filter((u) => u.role === 'member').length;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      <main className="pt-16 p-8 transition-[margin] duration-200 ease-out" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-accent" />
            <h1
              className="text-3xl font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
            >
              Admin Panel
            </h1>
          </div>
          <p className="text-text-secondary">Manage user roles and access permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {users.length}
              </div>
              <div className="text-sm text-text-tertiary">Total Users</div>
            </div>
          </div>
          <div className="bg-surface rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {adminCount}
              </div>
              <div className="text-sm text-text-tertiary">Admins</div>
            </div>
          </div>
          <div className="bg-surface rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {memberCount}
              </div>
              <div className="text-sm text-text-tertiary">Members</div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-divider p-4">
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Task Approval Queue
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Review member-submitted tasks before they become visible to the wider project team.
              </p>
            </div>
            <button
              onClick={loadPendingTasks}
              className="p-2 text-text-tertiary hover:text-accent hover:bg-surface-sunken rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {pendingLoading ? (
            <div className="p-10 text-center text-text-tertiary">Loading pending tasks...</div>
          ) : pendingTasks.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken">
                <Clock3 className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="font-medium text-text-primary">No tasks waiting for approval</p>
              <p className="mt-1 text-sm text-text-tertiary">New member submissions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {pendingTasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-border-subtle bg-surface-sunken px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">{task.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getTaskApprovalClasses(task.approval_status)}`}
                        >
                          {getTaskApprovalLabel(task.approval_status)}
                        </span>
                      </div>
                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-text-tertiary">{task.description}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClasses(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-text-secondary md:grid-cols-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Project
                      </p>
                      <p>{getProjectName(task.project_id)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Submitted By
                      </p>
                      <p className="break-all">{getUserLabel(task.created_by)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Due Date
                      </p>
                      <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => void updateTaskApproval(task.id, 'rejected')}
                      disabled={approvingTaskId === task.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-700 bg-surface px-3 py-2 text-sm font-medium text-red-700 transition-all duration-200 hover:bg-red-700 hover:text-white hover:shadow-sm disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => void updateTaskApproval(task.id, 'approved')}
                      disabled={approvingTaskId === task.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approvingTaskId === task.id ? 'Saving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Management Table */}
        <div className="bg-surface rounded-lg shadow-sm">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              User Management
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-64"
                />
              </div>
              <button
                onClick={loadUsers}
                className="p-2 text-text-tertiary hover:text-accent hover:bg-surface-sunken rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-text-tertiary">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-text-tertiary">
              {search ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-semibold">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary text-sm">
                            {user.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-text-tertiary">{user.email || user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-surface-hover text-text-secondary'
                        }`}
                      >
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-tertiary">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRole(user.id, user.role)}
                        disabled={updatingId === user.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.role === 'admin'
                            ? 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
                            : 'bg-accent/10 text-accent hover:bg-accent/20'
                        } disabled:opacity-50`}
                      >
                        {updatingId === user.id
                          ? 'Updating...'
                          : user.role === 'admin'
                            ? 'Demote to Member'
                            : 'Promote to Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
