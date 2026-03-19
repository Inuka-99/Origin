import { Search, Bell, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthUser, LogoutButton } from '../auth';

export function TopBar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthUser();

  // Derive initials from Auth0 user name (e.g. "Sarah Johnson" → "SJ")
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-56 z-10 flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="w-full bg-[#F7F8FA] border-0 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]/20"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#204EA7] rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name ?? 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {user?.email ?? ''}
              </div>
            </div>
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 bg-[#204EA7] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name ?? 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email ?? ''}
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  Profile Settings
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Preferences
                </button>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <LogoutButton />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
