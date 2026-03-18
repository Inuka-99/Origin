import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { TodaysFocus } from '../components/TodaysFocus';
import { RecentlyCompleted } from '../components/RecentlyCompleted';
import { AssignedToMe } from '../components/AssignedToMe';
import { Settings, ChevronDown, BarChart3, Activity, TrendingUp as TrendingUpIcon, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Dashboard() {
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [greeting, setGreeting] = useState('Good afternoon');

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
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="ml-56 pt-16">
        <div className="p-8">
          {/* Personalized Greeting Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{greeting}, Sarah</p>
                <h1 className="text-4xl mb-2 font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  What are we working on today?
                </h1>
                <p className="text-sm text-gray-500 font-normal">Here's a quick overview of your tasks.</p>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowWidgetMenu(!showWidgetMenu)}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  Customize Dashboard
                  <ChevronDown className={`w-4 h-4 transition-transform ${showWidgetMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showWidgetMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Add Widget
                    </div>
                    {widgetOptions.map((widget) => (
                      <button
                        key={widget.id}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => {
                          // Placeholder for adding widget
                          setShowWidgetMenu(false);
                        }}
                      >
                        <widget.icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700 font-medium">{widget.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Focus and Recently Completed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TodaysFocus />
            <RecentlyCompleted />
          </div>

          {/* Assigned to Me - Full Width */}
          <div className="mb-8">
            <AssignedToMe />
          </div>
        </div>
      </main>
    </div>
  );
}