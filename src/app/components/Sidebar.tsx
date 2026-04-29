import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  Calendar,
  Users,
  Settings,
  MessageSquare,
  Shield,
  Kanban,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useUserRole } from '../auth/useUserRole';
import { useSidebarState } from '../layout';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
  /** If true, only visible to admins */
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Folder, label: 'Projects', path: '/projects' },
  { icon: Kanban, label: 'Board', path: '/project-board' },
  { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
  { icon: MessageSquare, label: 'Messages', path: '/messages', badge: 3 },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: Activity, label: 'Activity Log', path: '/activity-log' },
  { icon: Shield, label: 'Admin', path: '/admin', adminOnly: true },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { collapsed, toggle } = useSidebarState();

  // Filter menu items based on user role
  const visibleItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <aside
      className="h-screen fixed left-0 top-0 flex flex-col z-20 transition-[width] duration-200 ease-out"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        color: 'var(--sidebar-fg)',
      }}
      aria-label="Primary navigation"
    >
      {/* Logo Area — full wordmark when expanded, single "O" when collapsed */}
      <div className={`px-5 py-6 ${collapsed ? 'flex justify-center px-0' : ''}`}>
        <div
          className="text-xl font-bold tracking-tight transition-all"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--sidebar-fg)' }}
          aria-label="Origin"
        >
          {collapsed ? 'O' : 'ORIGIN'}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 pt-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`relative w-full flex items-center rounded-lg mb-0.5 transition-all ${
                collapsed ? 'justify-center px-0 py-2.5 h-10' : 'gap-3 px-3 py-2.5'
              }`}
              style={{
                background: isActive ? 'var(--sidebar-item-active)' : 'transparent',
                color: isActive ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-item-hover)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-fg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-fg-muted)';
                }
              }}
            >
              {/* Accent Bar for Active State */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {item.badge && item.badge > 0 && (
                collapsed ? (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    aria-label={`${item.badge} unread`}
                  />
                ) : (
                  <span
                    className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    {item.badge}
                  </span>
                )
              )}
            </button>
          );
        })}
      </nav>

      {/* Role indicator + Collapse toggle at bottom */}
      <div
        className="flex flex-col gap-1"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        {isAdmin && !collapsed && (
          <div className="px-4 pt-3">
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: 'var(--sidebar-fg-muted)' }}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Access</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`mx-2 my-3 flex items-center rounded-lg transition-colors ${
            collapsed ? 'justify-center h-9 w-9 self-center' : 'justify-between px-3 py-2 h-9'
          }`}
          style={{ color: 'var(--sidebar-fg-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-item-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-fg)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-fg-muted)';
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <span className="text-xs font-medium">Collapse</span>
              <ChevronLeft className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
