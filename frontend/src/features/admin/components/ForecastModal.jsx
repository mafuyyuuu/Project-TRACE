import FilterSelect from '@/components/FilterSelect';
import { forecastCeiling } from '@/utils/forecastScale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ModalShell from '@/components/ModalShell';

/** Full seven-day estimate uses the same server series as the compact card. */
export default function ForecastModal({ open, onClose, forecastData, forecast = {}, forecastFilter, setForecastFilter }) {
  const chartData = (forecastData || []).map(f => ({day:f.day,volume:f.predicted_volume}));

  return (
    <ModalShell open={open} onClose={onClose} title="7-Day Volume Forecast" showCloseButton={false} subtitle={forecast.source === 'prophet' ? 'Prophet estimate fitted to recorded incoming requests.' : forecast.source === 'historical_weekday_average' ? 'Historical weekday average from recorded incoming requests.' : 'Recorded request history is required for an estimate.'} headerActions={<FilterSelect aria-label="Forecast document type"
          value={forecastFilter}
          onChange={(e) => setForecastFilter(e.target.value)}
          className="trace-control cursor-pointer"
        >
          <option value="All">All Documents</option>
          {(forecast.document_types || []).map(type=><option key={type} value={type}>{type}</option>)}
        </FilterSelect>} maxWidth="max-w-[800px]" panelClassName="trace-modal-panel trace-admin-main-dialog trace-admin-forecast max-w-[800px]">
      {chartData.length > 0 ? (
        <div className="overflow-x-auto"><div className="h-80 min-w-[20rem]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolumeExpanded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: '0.625rem', fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: '0.625rem', fontWeight: 'bold' }} allowDecimals={false} domain={[0, forecastCeiling(forecastData)]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: 'var(--trace-chart-accent)', fontWeight: 'bold' }}
                labelStyle={{ color: 'var(--trace-chart-text)', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="volume"
                stroke="var(--trace-chart-line)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorVolumeExpanded)"
                activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div></div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-400 font-medium text-xs">{forecast.loading ? 'Loading forecast data…' : forecast.error || forecast.message || 'Not enough recorded request history for an estimate.'}</div>
      )}

      <div className="trace-admin-forecast-days mt-6 grid gap-2">
        {chartData.map((d) => (
          <div key={d.day} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">{d.day}</div>
            <div className="text-sm font-black text-gray-900 dark:text-gray-100 mt-1">{d.volume}</div><div className="mt-1 text-[10px] text-gray-400 dark:text-gray-400">docs</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
