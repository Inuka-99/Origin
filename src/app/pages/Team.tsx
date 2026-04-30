import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Search, Plus, Mail, MoreVertical, Shield, User } from 'lucide-react';
import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  avatar: string;
  department: string;
  status: 'Active' | 'Invited';
  tasksCount: number;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'Admin',
    avatar: 'SJ',
    department: 'Product',
    status: 'Active',
    tasksCount: 12
  },
  {
    id: '2',
    name: 'Alex Morgan',
    email: 'alex@company.com',
    role: 'Member',
    avatar: 'AM',
    department: 'Engineering',
    status: 'Active',
    tasksCount: 18
  },
  {
    id: '3',
    name: 'Jordan Lee',
    email: 'jordan@company.com',
    role: 'Member',
    avatar: 'JL',
    department: 'Engineering',
    status: 'Active',
    tasksCount: 15
  },
  {
    id: '4',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'Member',
    avatar: 'SC',
    department: 'Design',
    status: 'Active',
    tasksCount: 10
  },
  {
    id: '5',
    name: 'Emma Martinez',
    email: 'emma@company.com',
    role: 'Admin',
    avatar: 'EM',
    department: 'Marketing',
    status: 'Active',
    tasksCount: 8
  },
  {
    id: '6',
    name: 'Michael Kim',
    email: 'michael@company.com',
    role: 'Member',
    avatar: 'MK',
    department: 'Engineering',
    status: 'Active',
    tasksCount: 14
  },
  {
    id: '7',
    name: 'Rachel Harris',
    email: 'rachel@company.com',
    role: 'Member',
    avatar: 'RH',
    department: 'Marketing',
    status: 'Invited',
    tasksCount: 0
  },
  {
    id: '8',
    name: 'Tom Brown',
    email: 'tom@company.com',
    role: 'Member',
    avatar: 'TB',
    department: 'Engineering',
    status: 'Active',
    tasksCount: 11
  }
];

export function Team() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = mockTeamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {mockTeamMembers.length}
            </div>
            <div className="text-sm text-text-secondary">Total Members</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {mockTeamMembers.filter(m => m.status === 'Active').length}
            </div>
            <div className="text-sm text-text-secondary">Active</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {mockTeamMembers.filter(m => m.role === 'Admin').length}
            </div>
            <div className="text-sm text-text-secondary">Admins</div>
          </div>
          <div className="bg-surface rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              {mockTeamMembers.filter(m => m.status === 'Invited').length}
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

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredMembers.map((member) => (
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

        {filteredMembers.length === 0 && (
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
      </main>
    </div>
  );
}
