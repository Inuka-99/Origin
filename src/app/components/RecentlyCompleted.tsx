import { CheckCircle2 } from 'lucide-react';

interface CompletedTask {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    color?: string;
  };
  updated_at: string;
}

interface RecentlyCompletedProps {
  tasks: CompletedTask[];
  loading?: boolean;
}

const sampleCompletedTasks: CompletedTask[] = [
  {
    id: '1',
    title: 'Design system color palette update',
    project: { id: '1', name: 'Design System', color: 'var(--accent)' },
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: '2',
    title: 'Database migration script',
    project: { id: '2', name: 'Backend Infrastructure', color: '#16A34A' },
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
  },
  {
    id: '3',
    title: 'User onboarding flow documentation',
    project: { id: '3', name: 'Product Docs', color: '#9333EA' },
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
  },
  {
    id: '4',
    title: 'Fix login page responsive issues',
    project: { id: '4', name: 'Frontend', color: '#DC2626' },
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
  },
  {
    id: '5',
    title: 'Security audit report review',
    project: { id: '5', name: 'Security', color: '#EA580C' },
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  }
];

export function RecentlyCompleted({ tasks, loading = false }: RecentlyCompletedProps) {
  // Use provided tasks or fallback to sample
 if (!tasks || tasks.length === 0) {
    tasks = sampleCompletedTasks;
  }
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hours ago`;
    } else {
      return 'Just now';
    }
  };
  return (
    <div className="bg-surface rounded-lg shadow-sm border border-divider flex flex-col" style={{ height: '480px' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-divider">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
            Recently Completed
          </h2>
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-text-tertiary">Loading completed tasks...</div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg"
              >
                <div className="mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-green-500 opacity-60" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-tertiary mb-1 line-through">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.project && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium opacity-50"
                        style={{ 
                          backgroundColor: `${task.project.color || '#204EA7'}15`,
                          color: task.project.color || '#204EA7'
                        }}
                      >
                        {task.project.name}
                      </span>
                    )}
                    <span className="text-xs text-text-tertiary">
                      {formatTimeAgo(task.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
