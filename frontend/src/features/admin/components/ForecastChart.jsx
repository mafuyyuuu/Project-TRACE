import {LineChart,Line,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer} from 'recharts';
import {forecastChartData,forecastDate} from '@/utils/forecastPresentation';
/** One chart presentation for the dashboard and expanded forecast. */
export default function ForecastChart({forecastData=[],forecast={},expanded=false}) {
  const data=forecastChartData(forecast.history,forecastData,forecast.today);
  const hasHistory=(forecast.history || []).length>0;
  return <div className="space-y-2 min-w-0">
    <div className="overflow-x-auto" role="region" aria-label="Recorded requests and seven-day demand forecast" tabIndex={0}>
      <div className={expanded?'h-80 w-full min-w-0':'h-60 w-full min-w-0'}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:16,right:24,left:4,bottom:12}}>
          <XAxis dataKey="date" tickFormatter={value=>forecastDate(value)} tick={{fontSize:'0.625rem',fill:'var(--trace-chart-text)'}} minTickGap={20}/>
          <YAxis allowDecimals={false} domain={[0,'auto']} tick={{fontSize:'0.625rem',fill:'var(--trace-chart-text)'}} width={36}/>
          <Tooltip labelFormatter={value=>forecastDate(value,true)} contentStyle={{borderRadius:'12px',border:'none',background:'var(--trace-chart-surface)',color:'var(--trace-chart-text)'}}/>
          <Legend wrapperStyle={{fontSize:'0.6875rem'}}/>
          {hasHistory && <Line name="Recorded requests" type="linear" dataKey="actual" stroke="var(--trace-chart-line)" strokeWidth={2} dot={{r:2}} connectNulls={false} isAnimationActive={false}/>}
          <Line name="Predicted requests" type="linear" dataKey="predicted" stroke="var(--trace-chart-accent)" strokeWidth={3} strokeDasharray="6 4" dot={{r:4}} connectNulls={false} isAnimationActive={false}/>
        </LineChart></ResponsiveContainer>
      </div>
    </div>
  </div>;
}
