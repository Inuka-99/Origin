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
import { Shield, Users, UserCheck, UserX, Search, RefreshCw } from 'lucide-react';
import { useApiClient } from '../lib/api-client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

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
