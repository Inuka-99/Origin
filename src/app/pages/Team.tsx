import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Plus, Mail, MoreVertical, Shield, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApiClient, unwrapList, type PaginatedList } from '../lib/api-client';
import { useTeamMembers } from '../lib/useTeamMembers';

interface Project {
  id: string;
  name: string;
}

interface MemberCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function Team() {
  const api = useApiClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { members, loading, error, refetch } = useTeamMembers();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<MemberCandidate[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!isInviteOpen) return;

    let cancelled = false;
    const loadProjects = async () => {
      try {
        setInviteError(null);
        const response = await api.get<Project[] | PaginatedList<Project>>('/projects?limit=100');
        const list = unwrapList(response);
        if (cancelled) return;
        setProjects(list);
        setSelectedProjectId((current) => current || list[0]?.id || '');
      } catch (err) {
        if (!cancelled) {
          setInviteError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      }
    };

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [api, isInviteOpen]);

  useEffect(() => {
    if (!isInviteOpen || !selectedProjectId) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setCandidateLoading(true);
        setInviteError(null);
        const qs = candidateQuery.trim()
          ? `?q=${encodeURIComponent(candidateQuery.trim())}`
          : '';
        const list = await api.get<MemberCandidate[]>(
          `/projects/${selectedProjectId}/member-candidates${qs}`,
        );
        if (!cancelled) setCandidates(list);
      } catch (err) {
        if (!cancelled) {
          setCandidates([]);
          setInviteError(err instanceof Error ? err.message : 'Failed to search users');
        }
      } finally {
        if (!cancelled) setCandidateLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [api, candidateQuery, isInviteOpen, selectedProjectId]);

  const addMember = async (candidate: MemberCandidate) => {
    if (!selectedProjectId) return;

    try {
      setInviteLoading(true);
      setInviteError(null);
      await api.post(`/projects/${selectedProjectId}/members`, {
        user_id: candidate.id,
        role: inviteRole,
      });
      setCandidateQuery('');
      setCandidates([]);
      setIsInviteOpen(false);
      await refetch();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="pt-16 p-8 transition-[margin] duration-200 ease-out" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              Team
            </h1>
            <p className="text-text-secondary">Manage team members and their roles</p>
          </div>
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {members.length}
            </div>
            <div className="text-sm text-text-secondary">Total Members</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {members.filter(m => m.status === 'Active').length}
            </div>
            <div className="text-sm text-text-secondary">Active</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {members.filter(m => m.role === 'Admin').length}
            </div>
            <div className="text-sm text-text-secondary">Admins</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {members.filter(m => m.status === 'Invited').length}
            </div>
            <div className="text-sm text-text-secondary">Pending Invites</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-surface rounded-lg p-4 mb-6 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">Failed to load team data</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {loading ? (
            <div className="col-span-full bg-surface rounded-lg p-12 text-center shadow-sm">
              <p className="text-sm text-text-tertiary">Loading team members...</p>
            </div>
          ) : filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-surface rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-accent/20"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{member.name}</h3>
                    <p className="text-sm text-text-secondary">{member.department}</p>
                  </div>
                </div>
                <button className="p-1 hover:bg-surface-hover rounded">
                  <MoreVertical className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                <Mail className="w-4 h-4" />
                {member.email}
              </div>

              {/* Stats and Role */}
              <div className="flex items-center justify-between pt-4 border-t border-divider">
                <div className="flex items-center gap-2">
                  {member.role === 'Admin' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-hover text-text-secondary">
                      <User className="w-3 h-3" />
                      Member
                    </span>
                  )}
                  {member.status === 'Invited' && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  )}
                </div>
                {member.status === 'Active' && (
                  <span className="text-sm text-text-secondary">{member.tasksCount} tasks</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredMembers.length === 0 && (
          <div className="bg-surface rounded-lg p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              No members found
            </h3>
            <p className="text-text-secondary">Try adjusting your search</p>
          </div>
        )}

        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-xl bg-surface p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Invite Member
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">Add an existing user to one of your projects.</p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-lg p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
                  aria-label="Close invite dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value);
                      setCandidateQuery('');
                    }}
                    className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {projects.length === 0 ? (
                      <option value="">No projects available</option>
                    ) : (
                      projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as 'member' | 'admin')}
                    className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">User</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={candidateQuery}
                      onChange={(event) => setCandidateQuery(event.target.value)}
                      placeholder="Search by name or email"
                      disabled={!selectedProjectId}
                      className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {inviteError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">{inviteError}</p>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto rounded-lg border border-divider">
                  {candidateLoading ? (
                    <div className="p-4 text-center text-sm text-text-tertiary">Searching users...</div>
                  ) : candidates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-tertiary">
                      {selectedProjectId ? 'No available users found.' : 'Select a project first.'}
                    </div>
                  ) : (
                    candidates.map((candidate) => {
                      const name = candidate.full_name?.trim() || candidate.email?.trim() || 'Unnamed user';
                      const email = candidate.email?.trim() || 'No email';
                      const initials = name
                        .split(/[\s@._-]+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase() || 'U';

                      return (
                        <button
                          key={candidate.id}
                          onClick={() => void addMember(candidate)}
                          disabled={inviteLoading}
                          className="flex w-full items-center justify-between gap-3 border-b border-divider px-4 py-3 text-left last:border-b-0 hover:bg-surface-sunken disabled:cursor-wait disabled:opacity-70"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                              {initials}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-text-primary">{name}</span>
                              <span className="block truncate text-xs text-text-secondary">{email}</span>
                            </span>
                          </span>
                          <span className="text-xs font-medium text-accent">Add</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
