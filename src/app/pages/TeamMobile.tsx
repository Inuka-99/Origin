import { MobileTopBar } from '../components/MobileTopBar';
import { Search, Plus, Mail, Shield, User, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTeamMembers } from '../lib/useTeamMembers';

export function TeamMobile() {
  const [searchQuery, setSearchQuery] = useState('');
  const { members, loading, error } = useTeamMembers();

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas">
      <MobileTopBar />

      <main className="pt-14">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                Team
              </h1>
              <p className="text-sm text-text-secondary">Manage team members</p>
            </div>
            <button className="p-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                {members.length}
              </div>
              <div className="text-xs text-text-secondary">Total Members</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                {members.filter(m => m.status === 'Active').length}
              </div>
              <div className="text-xs text-text-secondary">Active</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Failed to load team data</p>
              <p className="mt-1 text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Team Members List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-surface rounded-lg p-8 text-center shadow-sm">
                <p className="text-sm text-text-tertiary">Loading team members...</p>
              </div>
            ) : filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-surface rounded-lg p-4 shadow-sm border border-divider"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {member.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {member.name}
                        </h3>
                        <p className="text-xs text-text-secondary">{member.department}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2">
                      <Mail className="w-3.5 h-3.5" />
                      {member.email}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {member.role === 'Admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-surface-hover text-text-secondary">
                          <User className="w-3 h-3" />
                          Member
                        </span>
                      )}
                      {member.status === 'Invited' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      )}
                      {member.status === 'Active' && (
                        <span className="text-xs text-text-secondary">{member.tasksCount} tasks</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && filteredMembers.length === 0 && (
            <div className="bg-surface rounded-lg p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                No members found
              </h3>
              <p className="text-sm text-text-secondary">Try adjusting your search</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
