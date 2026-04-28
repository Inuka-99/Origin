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
    <header
      className="surface-glass h-16 fixed top-0 right-0 z-10 flex items-center justify-between px-8 transition-[left] duration-200 ease-out"
      style={{
        left: 'var(--sidebar-width)',
        borderBottom: '1px solid var(--topbar-border)',
        color: 'var(--topbar-fg)',
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="w-full bg-surface-sunken border-0 rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-text-primary">
                {user?.name ?? 'User'}
              </div>
              <div className="text-xs text-text-tertiary">
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
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              ></div>
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-card-lg py-2 z-20"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: '1px solid var(--divider)' }}
                >
                  <div className="text-sm font-medium text-text-primary">
                    {user?.name ?? 'User'}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {user?.email ?? ''}
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  Profile Settings
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Preferences
                </button>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
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
