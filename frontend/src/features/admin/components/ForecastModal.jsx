import FilterSelect from '@/components/FilterSelect';
import ModalShell from '@/components/ModalShell';
import ForecastChart from './ForecastChart';
import ForecastDays from './ForecastDays';
import ForecastEvidence from './ForecastEvidence';

/** The expanded view exposes the dated predictions and exact aggregate model input. */
export default function ForecastModal({open,onClose,forecastData,forecast={},forecastFilter,setForecastFilter}) {
  return <ModalShell open={open} onClose={onClose} title="7-Day Volume Forecast" subtitle="Upcoming document demand, recorded history and source evidence." maxWidth="max-w-[800px]" panelClassName="trace-modal-panel trace-admin-main-dialog trace-admin-forecast max-w-[800px]">
    <div className="trace-actions justify-end mb-4"><FilterSelect aria-label="Forecast document type" value={forecastFilter} onChange={event=>setForecastFilter(event.target.value)} className="trace-control cursor-pointer"><option value="All">All Documents</option>{(forecast.document_types || []).map(type=><option key={type} value={type}>{type}</option>)}</FilterSelect></div>
    {forecastData?.length>0?<><ForecastChart forecastData={forecastData} forecast={forecast} expanded/><ForecastDays forecastData={forecastData}/></>:<p role="status" className="trace-page-description py-8">{forecast.loading?'Loading forecast data…':forecast.error || forecast.message || 'Not enough recorded request history for an estimate.'}</p>}
    <ForecastEvidence forecast={forecast} details/>
  </ModalShell>;
}
