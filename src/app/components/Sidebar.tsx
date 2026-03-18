import { LayoutDashboard, Folder, CheckSquare, Calendar, Users, Settings, MessageSquare } from 'lucide-react';
// TODO: restore image import once asset is available
// import originLogo from 'figma:asset/966bedd3383407a6804dcd0980785a3c1cd7d32b.png';
import { useNavigate, useLocation } from 'react-router';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Folder, label: 'Projects', path: '/projects' },
  { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
  { icon: MessageSquare, label: 'Messages', path: '/messages', badge: 3 },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-56 bg-[#203D70] h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo Area */}
      <div className="px-4 py-6">
        {/* Logo */}
        <div className="mb-4">
          <div className="text-white text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>ORIGIN</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 pt-2">
        {menuItems.map((item) => {
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
    </aside>
  );
}