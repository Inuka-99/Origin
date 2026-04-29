import { ArrowLeft, Plus, GripVertical, MessageSquare, Calendar as CalendarIcon, MoreVertical, CheckSquare } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  project: string;
  projectColor: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  assignees: string[];
  comments: number;
  subtasks?: { completed: number; total: number };
  completed?: boolean;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const mockColumns: Column[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tasks: [
      {
        id: '1',
        title: 'Create user authentication flow',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'Medium',
        dueDate: 'Mar 15',
        assignees: ['AM', 'JL'],
        comments: 3,
        subtasks: { completed: 2, total: 5 }
      },
      {
        id: '2',
        title: 'Design mobile app wireframes',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Low',
        dueDate: 'Mar 20',
        assignees: ['SC'],
        comments: 1,
        subtasks: { completed: 0, total: 3 }
      }
    ]
  },
  {
    id: 'todo',
    title: 'To Do',
    tasks: [
      {
        id: '3',
        title: 'Update homepage banner images',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'High',
        dueDate: 'Mar 6',
        assignees: ['SJ'],
        comments: 5,
        subtasks: { completed: 1, total: 2 }
      },
      {
        id: '4',
        title: 'Review API documentation',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'Medium',
        dueDate: 'Mar 8',
        assignees: ['AM', 'PW'],
        comments: 2,
        subtasks: { completed: 3, total: 4 }
      },
      {
        id: '5',
        title: 'Set up analytics tracking',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'High',
        dueDate: 'Mar 7',
        assignees: ['JL', 'MK', 'TB'],
        comments: 7,
        subtasks: { completed: 0, total: 6 }
      }
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tasks: [
      {
        id: '6',
        title: 'Implement payment gateway integration',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 5',
        assignees: ['AM'],
        comments: 12,
        subtasks: { completed: 4, total: 8 }
      },
      {
        id: '7',
        title: 'Create responsive navigation menu',
        project: 'Frontend',
        projectColor: '#204EA7',
        priority: 'Medium',
        dueDate: 'Mar 6',
        assignees: ['SJ', 'SC'],
        comments: 4,
        subtasks: { completed: 2, total: 3 }
      }
    ]
  },
  {
    id: 'review',
    title: 'Review',
    tasks: [
      {
        id: '8',
        title: 'User dashboard layout refinements',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Medium',
        dueDate: 'Mar 4',
        assignees: ['SC', 'EM'],
        comments: 8,
        subtasks: { completed: 5, total: 5 }
      },
      {
        id: '9',
        title: 'Database optimization queries',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 5',
        assignees: ['PW'],
        comments: 3,
        subtasks: { completed: 1, total: 4 }
      }
    ]
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [
      {
        id: '10',
        title: 'Initial project setup and configuration',
        project: 'Backend',
        projectColor: '#16A34A',
        priority: 'High',
        dueDate: 'Mar 1',
        assignees: ['AM', 'PW'],
        comments: 15,
        subtasks: { completed: 8, total: 8 },
        completed: true
      },
      {
        id: '11',
        title: 'Design system color palette',
        project: 'Design',
        projectColor: '#9333EA',
        priority: 'Medium',
        dueDate: 'Feb 28',
        assignees: ['SC'],
        comments: 6,
        subtasks: { completed: 4, total: 4 },
        completed: true
      }
    ]
  }
];

export function ProjectBoardMobile() {
  const [columns] = useState(mockColumns);
  const [activeView, setActiveView] = useState('board');
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentColumnIndex < columns.length - 1) {
      setCurrentColumnIndex(currentColumnIndex + 1);
    } else if (direction === 'right' && currentColumnIndex > 0) {
      setCurrentColumnIndex(currentColumnIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 bg-surface border-b border-border-subtle z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center px-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
            Client Website Redesign
          </h1>
          <div className="w-11"></div> {/* Spacer for centering */}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[36px] transition-colors ${
              activeView === 'overview'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('board')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[36px] transition-colors ${
              activeView === 'board'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[36px] transition-colors ${
              activeView === 'list'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[36px] transition-colors ${
              activeView === 'calendar'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveView('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[36px] transition-colors ${
              activeView === 'activity'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-hover'
            }`}
          >
            Activity
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-24 px-4">
        {/* Column Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {columns.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentColumnIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentColumnIndex ? 'bg-accent w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Swipeable Column Container */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentColumnIndex * 100}%)` }}
          >
            {columns.map((column) => (
              <div key={column.id} className="w-full flex-shrink-0 px-1">
                {/* Column Header */}
                <div className="bg-surface rounded-lg p-4 mb-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                        {column.title}
                      </h2>
                      <span className="px-2 py-0.5 bg-surface-hover text-text-secondary text-sm font-semibold rounded-full">
                        {column.tasks.length}
                      </span>
                    </div>
                    <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <Plus className="w-5 h-5 text-accent" />
                    </button>
                  </div>
                </div>

                {/* Task Cards */}
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`bg-surface rounded-lg p-4 shadow-sm border border-border-subtle ${
                        task.completed ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Task Header */}
                      <div className="flex items-start gap-2 mb-3">
                        <GripVertical className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-medium mb-2 ${task.completed ? 'line-through' : 'text-text-primary'}`}>
                            {task.title}
                          </h3>

                          {/* Project Tag */}
                          <span
                            className="inline-block px-2.5 py-1 rounded text-xs font-medium mb-2"
                            style={{
                              backgroundColor: `${task.projectColor}15`,
                              color: task.projectColor
                            }}
                          >
                            {task.project}
                          </span>

                          {/* Priority & Due Date */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-text-tertiary">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {task.dueDate}
                            </span>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center -space-x-2">
                                {task.assignees.map((assignee, idx) => (
                                  <div
                                    key={idx}
                                    className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold border-2 border-surface"
                                  >
                                    {assignee}
                                  </div>
                                ))}
                              </div>
                              {task.subtasks && (
                                <div className="flex items-center gap-1 text-xs text-text-tertiary">
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  {task.subtasks.completed}/{task.subtasks.total}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-text-tertiary">
                              <MessageSquare className="w-4 h-4" />
                              {task.comments}
                            </div>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-surface-hover rounded min-w-[36px] min-h-[36px] flex items-center justify-center">
                          <MoreVertical className="w-5 h-5 text-text-tertiary" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Swipe Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 gap-4">
          <button
            onClick={() => handleSwipe('right')}
            disabled={currentColumnIndex === 0}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
              currentColumnIndex === 0
                ? 'bg-surface-hover text-text-tertiary cursor-not-allowed'
                : 'bg-surface-hover text-text-secondary hover:bg-gray-300'
            }`}
          >
            ← Previous
          </button>
          <button
            onClick={() => handleSwipe('left')}
            disabled={currentColumnIndex === columns.length - 1}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
              currentColumnIndex === columns.length - 1
                ? 'bg-surface-hover text-text-tertiary cursor-not-allowed'
                : 'bg-surface-hover text-text-secondary hover:bg-gray-300'
            }`}
          >
            Next →
          </button>
        </div>
      </main>

      {/* Floating Add Task Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center hover:scale-110 z-50">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}