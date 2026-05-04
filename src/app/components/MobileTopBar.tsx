import { useState } from 'react';
import { Menu, X, LayoutDashboard, Folder, CheckSquare, Calendar, Users, Settings, LogOut, MessageSquare } from 'lucide-react';
// TODO: restore image import once asset is available
// import originLogo from 'figma:asset/966bedd3383407a6804dcd0980785a3c1cd7d32b.png';
import { SmartRemindersBell } from './SmartRemindersBell';

export function MobileTopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard-mobile', badge: 0 },
    { icon: Folder, label: 'Projects', path: '/projects-mobile', badge: 0 },
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks-mobile', badge: 0 },
    { icon: MessageSquare, label: 'Messages', path: '/messages-mobile', badge: 3 },
    { icon: Calendar, label: 'Calendar', path: '/calendar-mobile', badge: 0 },
    { icon: Users, label: 'Team', path: '/team-mobile', badge: 0 },
    { icon: Settings, label: 'Settings', path: '/settings-mobile', badge: 0 },
  ];

  return (
    <>
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border-subtle z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-11 h-11 flex items-center justify-center text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Center: Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 flex items-center justify-center text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>ORIGIN</div>
          </div>

          {/* Right: Notifications */}
          <SmartRemindersBell
            taskRoute="/tasks-mobile"
            className="relative flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover"
            iconClassName="w-5 h-5"
          />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          {/* Slide-out Menu */}
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-sidebar z-50 flex flex-col">
            {/* Menu Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-surface/10">
              <div className="flex items-center gap-2">
                <img 
                  src={originLogo} 
                  alt="ORIGIN" 
                  className="h-10 w-auto"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-surface/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-surface/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-medium text-sm">
                  SJ
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Sarah Johnson</div>
                  <div className="text-xs text-white/60">sarah@company.com</div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto py-4">
              {menuItems.map((item, index) => (
                <a
                  key={index}
                  href={item.path}
                  className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-surface/5 transition-colors min-h-[44px] relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-auto bg-accent text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>

            {/* Sign Out */}
            <div className="p-4 border-t border-surface/10">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-surface/5 transition-colors rounded-lg w-full min-h-[44px]"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
