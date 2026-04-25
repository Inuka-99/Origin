import { LayoutDashboard, Folder, CheckSquare, Calendar, Users, Settings, MessageSquare, Shield, Kanban, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useUserRole } from '../auth/useUserRole';

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

  // Filter menu items based on user role
  const visibleItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <aside className="w-56 bg-[#203D70] h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo Area */}
      <div className="px-4 py-6">
        <div className="mb-4">
          <div className="text-white text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>ORIGIN</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 pt-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all ${
                isActive
                  ? 'bg-[#2a4a7f] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {/* Accent Bar for Active State */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#204EA7] rounded-r"></div>
              )}
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-[#204EA7] text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role indicator at bottom */}
      {isAdmin && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Access</span>
          </div>
        </div>
      )}
    </aside>
  );
}
