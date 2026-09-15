import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

const DECORATIVE = {
  up: [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 22 }, { v: 20 }, { v: 30 }, { v: 35 }],
  down: [{ v: 35 }, { v: 30 }, { v: 25 }, { v: 28 }, { v: 20 }, { v: 15 }, { v: 10 }],
};

/**
 * Trend sparkline for KPI stat cards. Decorative by default — an illustrative
 * 7-point curve conveying direction only, matching every existing call site.
 * Pass a real `data` series (each point `{ v, label }`) plus a `unit` to show
 * a measured trend with a hover tooltip instead.
 */
export default function MiniSparkline({ color = '#15803d', trend = 'up', data, unit, className = 'w-20 h-10 shrink-0' }) {
  const isReal = Boolean(data && data.length > 0);
  const points = isReal ? data : DECORATIVE[trend] || DECORATIVE.up;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          {isReal && (
            <Tooltip
              formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
            />
          )}
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={3} dot={false} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
