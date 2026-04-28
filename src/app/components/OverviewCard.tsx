import { LucideIcon } from 'lucide-react';

interface OverviewCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBgColor?: string;
  iconColor?: string;
}

export function OverviewCard({
  title,
  value,
  icon: Icon,
  trend,
  iconBgColor = 'bg-accent/10',
  iconColor = 'text-accent',
}: OverviewCardProps) {
  return (
    <div className="bg-surface rounded-lg p-6 border border-border-subtle" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-secondary mb-2">{title}</p>
          <p className="text-4xl font-semibold text-text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {value}
          </p>
          {trend && (
            <p
              className={`text-xs mt-2 font-medium ${
                trend.isPositive ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`${iconBgColor} ${iconColor} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}