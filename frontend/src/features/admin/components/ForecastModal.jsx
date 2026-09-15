import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ModalShell from '@/components/ModalShell';

/**
 * The full 7-day forecast, rather than the compact card's last-5-day slice.
 * Same per-type multiplier as the card — this is a display-only approximation
 * of the AI engine's total prediction, not a second forecast.
 */
export default function ForecastModal({ open, onClose, forecastData, forecastFilter, setForecastFilter }) {
  const chartData = (forecastData || []).map((f) => {
    let multiplier = 1;
    if (forecastFilter === 'Transcript of Records') multiplier = 0.4;
    if (forecastFilter === 'Clearance') multiplier = 0.3;
    if (forecastFilter === 'Diploma') multiplier = 0.2;
    return {
      day: f.day,
      volume: Math.max(1, Math.floor(f.predicted_volume * multiplier)),
    };
  });

  return (
    <ModalShell open={open} onClose={onClose} title="7-Day Volume Forecast" maxWidth="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <p className="text-xs text-gray-400 font-medium">Predicted incoming document volume via Prophet ML — full week.</p>
        <select
          value={forecastFilter}
          onChange={(e) => setForecastFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 font-bold cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:border-[#15803d]"
        >
          <option value="All">All Documents</option>
          <option value="Transcript of Records">Transcript of Records</option>
          <option value="Clearance">Clearance</option>
          <option value="Diploma">Diploma</option>
        </select>
      </div>

      {chartData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolumeExpanded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#15803d', fontWeight: 'bold' }}
                labelStyle={{ color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#0f172a"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorVolumeExpanded)"
                activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-400 font-medium text-xs">Loading forecast data...</div>
      )}

      <div className="mt-6 grid grid-cols-3 sm:grid-cols-7 gap-2">
        {chartData.map((d) => (
          <div key={d.day} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.day}</div>
            <div className="text-sm font-black text-gray-900 mt-1">{d.volume}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
