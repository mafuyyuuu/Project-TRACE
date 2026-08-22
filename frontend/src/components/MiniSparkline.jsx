import { ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * Decorative trend sparkline for KPI stat cards. The data is illustrative
 * only — it conveys direction, not measured values.
 */
export default function MiniSparkline({ color = '#15803d', trend = 'up' }) {
  const data = trend === 'up'
    ? [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 22 }, { v: 20 }, { v: 30 }, { v: 35 }]
    : [{ v: 35 }, { v: 30 }, { v: 25 }, { v: 28 }, { v: 20 }, { v: 15 }, { v: 10 }];

  return (
    <div className="w-20 h-10 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={3} dot={false} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
