import { MobileTopBar } from '../components/MobileTopBar';
import { Search, Plus, Mail, Shield, User, ChevronRight } from 'lucide-react';
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
    name: 'Rachel Harris',
    email: 'rachel@company.com',
    role: 'Member',
    avatar: 'RH',
    department: 'Marketing',
    status: 'Invited',
    tasksCount: 0
  }
];

export function TeamMobile() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = mockTeamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <MobileTopBar />

      <main className="pt-14">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                Team
              </h1>
              <p className="text-sm text-gray-600">Manage team members</p>
            </div>
            <button className="p-3 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                {mockTeamMembers.length}
              </div>
              <div className="text-xs text-gray-600">Total Members</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                {mockTeamMembers.filter(m => m.status === 'Active').length}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Team Members List */}
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#204EA7] flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {member.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {member.name}
                        </h3>
                        <p className="text-xs text-gray-600">{member.department}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
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
                        <span className="text-xs text-gray-600">{member.tasksCount} tasks</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                No members found
              </h3>
              <p className="text-sm text-gray-600">Try adjusting your search</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
