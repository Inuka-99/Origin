import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface TaskEvent {
  id: string;
  title: string;
  date: Date;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
}

const mockEvents: TaskEvent[] = [
  {
    id: '1',
    title: 'Design landing page',
    date: new Date(2026, 2, 4),
    priority: 'High',
    project: 'Website Redesign'
  },
  {
    id: '2',
    title: 'Review PR',
    date: new Date(2026, 2, 4),
    priority: 'High',
    project: 'Mobile App'
  },
  {
    id: '3',
    title: 'Team meeting',
    date: new Date(2026, 2, 5),
    priority: 'Medium',
    project: 'General'
  },
  {
    id: '4',
    title: 'Update docs',
    date: new Date(2026, 2, 8),
    priority: 'Medium',
    project: 'API Docs'
  },
  {
    id: '5',
    title: 'Deploy to staging',
    date: new Date(2026, 2, 10),
    priority: 'High',
    project: 'Mobile App'
  },
  {
    id: '6',
    title: 'Client presentation',
    date: new Date(2026, 2, 12),
    priority: 'High',
    project: 'Q4 Campaign'
  }
];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getEventsForDate = (date: Date) => {
    return mockEvents.filter(event => isSameDay(event.date, date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getPriorityColor = (priority: TaskEvent['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="ml-56 pt-16 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              Calendar
            </h1>
            <p className="text-gray-600">View and manage tasks by due date</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-[#204EA7] border-[#204EA7] text-white'
                          : isToday
                          ? 'bg-blue-50 border-[#204EA7] text-gray-900'
                          : isCurrentMonth
                          ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                          : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? 'bg-white' : getPriorityColor(event.priority)
                                }`}
                              ></div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                                +{dayEvents.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Events Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </h3>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#204EA7]/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(event.priority)}`}></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {event.title}
                          </h4>
                          <p className="text-xs text-gray-600">{event.project}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-white rounded text-xs font-medium text-gray-700">
                            {event.priority} Priority
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">No tasks scheduled</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-4">
              <h4 className="text-sm font-semibold mb-3 text-gray-900">Priority Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Low Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
