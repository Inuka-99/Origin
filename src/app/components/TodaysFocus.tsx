import { Clock, Filter, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    color?: string;
  };
  due_date?: string;
  status: string;
}

interface TodaysFocusProps {
  tasks?: Task[];
  loading?: boolean;
}

export function TodaysFocus({ tasks = [], loading = false }: TodaysFocusProps) {
  const [activeTab, setActiveTab] = useState('today');
  const displayTasks = tasks;

  // Filter tasks based on active tab
  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (activeTab) {
      case 'today':
        return displayTasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= today && dueDate < tomorrow && task.status !== 'done';
        });
      case 'overdue':
        return displayTasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate < today && task.status !== 'done';
        });
      case 'upcoming':
        return displayTasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= tomorrow && task.status !== 'done';
        });
      case 'unscheduled':
        return displayTasks.filter(task => !task.due_date && task.status !== 'done');
      default:
        return displayTasks.filter(task => task.status !== 'done');
    }
  };

  const filteredTasks = getFilteredTasks();

  const tabs = [
    { id: 'today', label: 'Today', count: displayTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      return dueDate >= todayStart && dueDate < todayEnd && task.status !== 'done';
    }).length },
    { id: 'overdue', label: 'Overdue', count: displayTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const today = new Date();
      return dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()) && task.status !== 'done';
    }).length },
    { id: 'upcoming', label: 'Upcoming', count: displayTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate >= tomorrow && task.status !== 'done';
    }).length },
    { id: 'unscheduled', label: 'Unscheduled', count: displayTasks.filter(task => !task.due_date && task.status !== 'done').length }
  ];

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase() ?? 'selected';

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-divider flex flex-col" style={{ height: '480px' }}>
      {/* Sticky Header */}
      <div className="flex-shrink-0 border-b border-divider">
        {/* Title Row */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
            Today's Focus
          </h2>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <Filter className="w-4 h-4 text-text-secondary" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-surface-hover rounded-lg transition-colors text-sm text-text-secondary">
              Sort
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
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

      {/* Scrollable Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-text-tertiary">Loading tasks...</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-divider px-4 text-center">
                <p className="text-sm text-text-tertiary">
                  There are no {activeTabLabel} tasks.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer group"
                >
                  <div className="mt-0.5">
                    <div className="w-5 h-5 rounded border-2 border-border-strong group-hover:border-accent transition-colors flex items-center justify-center">
                      {/* Empty checkbox */}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary mb-1">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.project && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${task.project.color || '#204EA7'}15`,
                            color: task.project.color || '#204EA7'
                          }}
                        >
                          {task.project.name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="flex-shrink-0 border-t border-divider p-4">
        <button className="w-full flex items-center justify-center gap-2 text-accent text-sm font-medium py-2 rounded-lg hover:bg-accent/5 transition-colors">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
