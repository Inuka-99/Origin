import { Clock, Filter, ChevronDown, Plus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../lib/useClickOutside';

interface Task {
  id: string;
  title: string;
  project: string;
  projectColor: string;
  dueTime: string;
}

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Review Q1 performance metrics',
    project: 'Analytics Dashboard',
    projectColor: '#204EA7',
    dueTime: '10:00 AM',
  },
  {
    id: '2',
    title: 'Update client presentation slides',
    project: 'Client Portal',
    projectColor: '#9333EA',
    dueTime: '2:00 PM',
  },
  {
    id: '3',
    title: 'Code review for authentication module',
    project: 'ORIGIN Platform',
    projectColor: '#16A34A',
    dueTime: '4:30 PM',
  },
  {
    id: '4',
    title: 'Team standup meeting',
    project: 'Engineering',
    projectColor: '#DC2626',
    dueTime: '9:30 AM',
  },
  {
    id: '5',
    title: 'Update documentation for API endpoints',
    project: 'Backend Infrastructure',
    projectColor: '#16A34A',
    dueTime: '3:00 PM',
  },
  {
    id: '6',
    title: 'Design review with product team',
    project: 'Design System',
    projectColor: '#204EA7',
    dueTime: '11:30 AM',
  },
];

type SortOption = 'time-asc' | 'time-desc' | 'title-asc';

const sortLabels: Record<SortOption, string> = {
  'time-asc': 'Earliest First',
  'time-desc': 'Latest First',
  'title-asc': 'Title A-Z',
};

const parseTimeToMinutes = (value: string) => {
  const [time, meridiem] = value.split(' ');
  const [hoursValue, minutesValue] = time.split(':').map(Number);
  let hours = hoursValue % 12;

  if (meridiem === 'PM') {
    hours += 12;
  }

  return hours * 60 + minutesValue;
};

export function TodaysFocus() {
  const [activeTab, setActiveTab] = useState('today');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('time-asc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(filterRef, () => setIsFilterOpen(false));
  useClickOutside(sortRef, () => setIsSortOpen(false));

  const tabs = [
    { id: 'today', label: 'Today', count: 6 },
    { id: 'overdue', label: 'Overdue', count: 3 },
    { id: 'upcoming', label: 'Upcoming', count: 12 },
    { id: 'unscheduled', label: 'Unscheduled', count: 8 },
  ];

  const projectOptions = ['all', ...new Set(sampleTasks.map((task) => task.project))];

  const visibleTasks = useMemo(() => {
    const matchingTasks = sampleTasks.filter((task) => {
      return projectFilter === 'all' || task.project === projectFilter;
    });

    const sortedTasks = [...matchingTasks];

    switch (sortBy) {
      case 'time-desc':
        sortedTasks.sort((left, right) => parseTimeToMinutes(right.dueTime) - parseTimeToMinutes(left.dueTime));
        break;
      case 'title-asc':
        sortedTasks.sort((left, right) => left.title.localeCompare(right.title));
        break;
      default:
        sortedTasks.sort((left, right) => parseTimeToMinutes(left.dueTime) - parseTimeToMinutes(right.dueTime));
        break;
    }

    return sortedTasks;
  }, [projectFilter, sortBy]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col" style={{ height: '480px' }}>
      <div className="flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
            Today's Focus
          </h2>
          <div className="flex items-center gap-2">
            <div ref={filterRef} className="relative">
              <button
                onClick={() => {
                  setIsFilterOpen((previous) => !previous);
                  setIsSortOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
              >
                <Filter className="w-4 h-4 text-gray-600" />
                {projectFilter === 'all' ? 'All Projects' : projectFilter}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-20">
                  {projectOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setProjectFilter(option);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        projectFilter === option ? 'bg-[#204EA7]/10 text-[#204EA7]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option === 'all' ? 'All Projects' : option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={sortRef} className="relative">
              <button
                onClick={() => {
                  setIsSortOpen((previous) => !previous);
                  setIsFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
              >
                Sort
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-20">
                  {(['time-asc', 'time-desc', 'title-asc'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        sortBy === option ? 'bg-[#204EA7]/10 text-[#204EA7]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#204EA7] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${activeTab === tab.id ? 'opacity-80' : 'opacity-60'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2">
        <div className="space-y-2">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-[#204EA7] transition-colors flex items-center justify-center">
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${task.projectColor}15`,
                      color: task.projectColor,
                    }}
                  >
                    {task.project}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {task.dueTime}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {visibleTasks.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              No tasks match the selected project filter.
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 p-4">
        <button className="w-full flex items-center justify-center gap-2 text-[#204EA7] text-sm font-medium py-2 rounded-lg hover:bg-[#204EA7]/5 transition-colors">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
