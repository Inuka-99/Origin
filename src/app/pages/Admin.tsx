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
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Database,
  ShieldCheck,
  HardDriveDownload,
  AlertTriangle,
  Activity,
  ArchiveRestore,
  Clock3,
  CheckCircle2,
} from 'lucide-react';
import { useApiClient } from '../lib/api-client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

const integrityOverview = [
  {
    label: 'Backup Coverage',
    value: '99.98%',
    detail: 'Nightly snapshots and hourly incrementals are healthy.',
    icon: HardDriveDownload,
    tone: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Consistency Checks',
    value: '12/12',
    detail: 'Schema, foreign key, and orphan record checks passed.',
    icon: ShieldCheck,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: 'Replication Lag',
    value: '1.2s',
    detail: 'Replica sync remains within the recovery target window.',
    icon: Activity,
    tone: 'bg-amber-100 text-amber-700',
  },
  {
    label: 'Open Anomalies',
    value: '2',
    detail: 'Two low-risk integrity warnings are queued for review.',
    icon: AlertTriangle,
    tone: 'bg-rose-100 text-rose-700',
  },
];

const protectionControls = [
  {
    title: 'Automated Backups',
    description: 'Protect against accidental deletes and incomplete writes.',
    items: ['Hourly incremental snapshots', 'Nightly full backup retention for 30 days', 'Weekly cold storage archive'],
  },
  {
    title: 'Consistency Rules',
    description: 'Catch broken relationships before they impact live workflows.',
    items: ['Foreign key drift validation', 'Duplicate record detection', 'Task/project membership reconciliation'],
  },
];

const restorePoints = [
  { label: 'Latest Snapshot', timestamp: 'Today, 7:10 PM', status: 'Ready' },
  { label: 'Pre-deploy Restore Point', timestamp: 'Today, 5:30 PM', status: 'Ready' },
  { label: 'Daily Archive', timestamp: 'April 16, 2026 11:59 PM', status: 'Stored' },
];

const integrityEvents = [
  {
    title: 'Orphan task references detected',
    meta: 'Project membership validator • 18 minutes ago',
    severity: 'Medium',
    status: 'Needs review',
  },
  {
    title: 'Backup verification completed',
    meta: 'Snapshot checksum job • 42 minutes ago',
    severity: 'Low',
    status: 'Resolved',
  },
  {
    title: 'Schema drift audit passed',
    meta: 'Deployment gatekeeper • 2 hours ago',
    severity: 'Low',
    status: 'Resolved',
  },
];

export function Admin() {
  const api = useApiClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const memberCount = users.filter((u) => u.role === 'member').length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      <main className="ml-56 pt-16 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-[#204EA7]" />
            <h1
              className="text-3xl font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}
            >
              Admin Panel
            </h1>
          </div>
          <p className="text-gray-600">Manage user roles and access permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {users.length}
              </div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {adminCount}
              </div>
              <div className="text-sm text-gray-500">Admins</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {memberCount}
              </div>
              <div className="text-sm text-gray-500">Members</div>
            </div>
          </div>
        </div>

        <section className="mb-6 overflow-hidden rounded-2xl border border-[#204EA7]/10 bg-gradient-to-r from-[#203D70] via-[#204EA7] to-[#2E6BE6] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/90">
                <Database className="w-3.5 h-3.5" />
                System Integrity
              </div>
              <h2
                className="mb-2 text-2xl font-semibold"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Prevent data loss and keep database state consistent
              </h2>
              <p className="max-w-xl text-sm leading-6 text-white/80">
                Monitor backup health, identify integrity drift, and prepare recovery workflows before issues reach production data.
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-1 text-xs uppercase tracking-wide text-white/60">Recovery Target</div>
                <div className="text-2xl font-semibold">15 min</div>
                <div className="text-xs text-white/70">Maximum acceptable point-in-time loss</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-1 text-xs uppercase tracking-wide text-white/60">Last Audit</div>
                <div className="text-2xl font-semibold">7:12 PM</div>
                <div className="text-xs text-white/70">Integrity monitor completed successfully</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Data Integrity
              </h2>
              <p className="text-sm text-gray-500">Early-warning signals and protection controls for workspace data.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Monitoring Active
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {integrityOverview.map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-lg p-2.5 ${item.tone}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Live</span>
                </div>
                <div className="mb-1 text-sm text-gray-500">{item.label}</div>
                <div className="mb-2 text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {item.value}
                </div>
                <p className="text-sm leading-5 text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Protection Controls
                  </h3>
                  <p className="text-sm text-gray-500">Core safeguards that preserve data integrity across the workspace.</p>
                </div>
                <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Review Policies
                </button>
              </div>

              <div className="space-y-4">
                {protectionControls.map((control) => (
                  <div key={control.title} className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                    <div className="mb-1 text-base font-semibold text-gray-900">{control.title}</div>
                    <div className="mb-3 text-sm text-gray-500">{control.description}</div>
                    <div className="flex flex-wrap gap-2">
                      {control.items.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="mb-4 flex items-center gap-2">
                  <ArchiveRestore className="w-5 h-5 text-[#204EA7]" />
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Recovery Readiness
                  </h3>
                </div>
                <div className="space-y-3">
                  {restorePoints.map((point) => (
                    <div key={point.label} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{point.label}</div>
                        <div className="text-xs text-gray-500">{point.timestamp}</div>
                      </div>
                      <span className="rounded-full bg-[#204EA7]/10 px-2.5 py-1 text-[11px] font-medium text-[#204EA7]">
                        {point.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button className="flex-1 rounded-lg bg-[#204EA7] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a3d8a] transition-colors">
                    Run Restore Drill
                  </button>
                  <button className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Export Audit Log
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="mb-4 flex items-center gap-2">
                  <Clock3 className="w-5 h-5 text-[#204EA7]" />
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Recent Integrity Events
                  </h3>
                </div>
                <div className="space-y-3">
                  {integrityEvents.map((event) => (
                    <div key={event.title} className="rounded-lg border border-gray-100 px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            event.status === 'Needs review'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{event.meta}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Severity: {event.severity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* User Management Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              User Management
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent w-64"
                />
              </div>
              <button
                onClick={loadUsers}
                className="p-2 text-gray-500 hover:text-[#204EA7] hover:bg-gray-50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {search ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-sm font-semibold">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {user.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-gray-500">{user.email || user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRole(user.id, user.role)}
                        disabled={updatingId === user.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.role === 'admin'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-[#204EA7]/10 text-[#204EA7] hover:bg-[#204EA7]/20'
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
