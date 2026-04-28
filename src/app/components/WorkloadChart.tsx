import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', tasks: 12 },
  { name: 'Tue', tasks: 19 },
  { name: 'Wed', tasks: 15 },
  { name: 'Thu', tasks: 22 },
  { name: 'Fri', tasks: 18 },
  { name: 'Sat', tasks: 8 },
  { name: 'Sun', tasks: 5 },
];

export function WorkloadChart() {
  return (
    <div className="bg-surface rounded-lg border border-border-subtle" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
      <div className="px-6 py-4 border-b border-border-subtle">
        <h3 className="font-semibold text-text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Workload Distribution
        </h3>
        <p className="text-xs text-text-tertiary mt-1">Tasks completed this week</p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#999999', fontSize: 12 }}
              axisLine={{ stroke: '#eeeeee' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#999999', fontSize: 12 }}
              axisLine={{ stroke: '#eeeeee' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(32, 78, 167, 0.05)' }}
            />
            <Bar dataKey="tasks" fill="#3d6bb3" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}