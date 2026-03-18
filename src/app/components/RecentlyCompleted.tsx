import { CheckCircle2 } from 'lucide-react';

interface CompletedTask {
  id: string;
  title: string;
  project: string;
  projectColor: string;
  completedAt: string;
}

const completedTasks: CompletedTask[] = [
  {
    id: '1',
    title: 'Design system color palette update',
    project: 'Design System',
    projectColor: '#204EA7',
    completedAt: '2 hours ago'
  },
  {
    id: '2',
    title: 'Database migration script',
    project: 'Backend Infrastructure',
    projectColor: '#16A34A',
    completedAt: '5 hours ago'
  },
  {
    id: '3',
    title: 'User onboarding flow documentation',
    project: 'Product Docs',
    projectColor: '#9333EA',
    completedAt: 'Yesterday'
  },
  {
    id: '4',
    title: 'Fix login page responsive issues',
    project: 'Frontend',
    projectColor: '#DC2626',
    completedAt: 'Yesterday'
  },
  {
    id: '5',
    title: 'Security audit report review',
    project: 'Security',
    projectColor: '#EA580C',
    completedAt: '2 days ago'
  }
];

export function RecentlyCompleted() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col" style={{ height: '480px' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
            Recently Completed
          </h2>
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        <div className="space-y-2">
          {completedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg"
            >
              <div className="mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-green-500 opacity-60" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-400 mb-1 line-through">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium opacity-50"
                    style={{ 
                      backgroundColor: `${task.projectColor}15`,
                      color: task.projectColor
                    }}
                  >
                    {task.project}
                  </span>
                  <span className="text-xs text-gray-400">
                    {task.completedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
