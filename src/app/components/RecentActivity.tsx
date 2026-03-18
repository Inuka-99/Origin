interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar: string;
}

const recentActivities: ActivityItem[] = [
  {
    id: '1',
    user: 'Michael Chen',
    action: 'completed task',
    target: 'Design system updates',
    time: '5 minutes ago',
    avatar: 'MC',
  },
  {
    id: '2',
    user: 'Emma Wilson',
    action: 'commented on',
    target: 'Q1 Planning document',
    time: '12 minutes ago',
    avatar: 'EW',
  },
  {
    id: '3',
    user: 'James Rodriguez',
    action: 'created project',
    target: 'Mobile App Redesign',
    time: '1 hour ago',
    avatar: 'JR',
  },
  {
    id: '4',
    user: 'Lisa Park',
    action: 'assigned you to',
    target: 'API Integration',
    time: '2 hours ago',
    avatar: 'LP',
  },
  {
    id: '5',
    user: 'David Kim',
    action: 'moved task',
    target: 'User Testing to In Progress',
    time: '3 hours ago',
    avatar: 'DK',
  },
];

export function RecentActivity() {
  return (
    <div className="bg-white rounded-lg border border-gray-200" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Recent Activity
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#204EA7] rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {activity.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>{' '}
                  <span className="text-gray-600">{activity.action}</span>{' '}
                  <span className="font-semibold text-[#204EA7]">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}