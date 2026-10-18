import {forecastDate} from '@/utils/forecastPresentation';
export default function ForecastDays({forecastData=[]}) {
  if(!forecastData.length)return null;
  return <div role="list" aria-label="Next seven days predicted demand" className="trace-admin-forecast-days mt-4 grid gap-2">
    {forecastData.map(row=><div role="listitem" key={row.date || row.day} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{forecastDate(row.date,true)}</div>
      <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{row.predicted_volume}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">predicted documents</div>
    </div>)}
  </div>;
}
