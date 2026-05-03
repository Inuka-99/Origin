import { MobileTopBar } from '../components/MobileTopBar';
import { TodaysFocus } from '../components/TodaysFocus';
import { RecentlyCompleted } from '../components/RecentlyCompleted';
import { AssignedToMe } from '../components/AssignedToMe';
import { Settings, ChevronDown, BarChart3, Activity, TrendingUp as TrendingUpIcon, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthUser } from '../auth/useAuthUser';
import { useTasks } from '../lib/useTasks';

export function DashboardMobile() {
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [greeting, setGreeting] = useState('Good afternoon');
  const { user } = useAuthUser();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  const widgetOptions = [
    { id: 'workload', name: 'Workload Distribution', icon: BarChart3 },
    { id: 'activity', name: 'Activity Feed', icon: Activity },
    { id: 'progress', name: 'Progress Overview', icon: TrendingUpIcon },
    { id: 'calendar', name: 'Calendar Snapshot', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <MobileTopBar />

      {/* Main Content */}
      <main className="pt-14">
        <div className="p-4">
          {/* Personalized Greeting Section */}
          <div className="mb-6">
            <p className="text-xs text-text-tertiary font-medium mb-0.5">{greeting}, {user?.name || 'User'}</p>
            <h1 className="text-2xl mb-1 font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
              What are we working on today?
            </h1>
            <p className="text-xs text-text-tertiary font-normal">Here's a quick overview of your tasks.</p>
          </div>

          {tasksError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Failed to load dashboard data</p>
              <p className="mt-1 text-xs text-red-600">{tasksError}</p>
            </div>
          )}

          {/* Customize Dashboard Button with Dropdown */}
          <div className="relative mb-6">
            <button 
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className="w-full bg-surface border border-border-subtle text-text-secondary px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-sunken transition-colors font-medium min-h-[44px] shadow-sm"
            >
              <Settings className="w-4 h-4" />
              Customize Dashboard
              <ChevronDown className={`w-4 h-4 transition-transform ${showWidgetMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showWidgetMenu && (
              <div className="absolute left-0 right-0 mt-2 bg-surface rounded-lg shadow-lg border border-border-subtle py-2 z-10">
                <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                  Add Widget
                </div>
                {widgetOptions.map((widget) => (
                  <button
                    key={widget.id}
                    className="w-full px-3 py-3 flex items-center gap-3 hover:bg-surface-sunken transition-colors text-left min-h-[44px]"
                    onClick={() => {
                      // Placeholder for adding widget
                      setShowWidgetMenu(false);
                    }}
                  >
                    <widget.icon className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary font-medium">{widget.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Today's Focus */}
          <div className="mb-6">
            <TodaysFocus tasks={tasks} loading={tasksLoading} />
          </div>

          {/* Recently Completed */}
          <div className="mb-6">
            <RecentlyCompleted tasks={tasks.filter(task => task.status === 'done')} loading={tasksLoading} />
          </div>

          {/* Assigned to Me - Full Width */}
          <div className="mb-6">
            <AssignedToMe tasks={tasks} loading={tasksLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
