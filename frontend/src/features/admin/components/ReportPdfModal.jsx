import {useId,useState} from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import useReportPdf from '@/hooks/useReportPdf';
export default function ReportPdfModal({filters,scopeText,recordsReady,onClose}) {
  const [kind,setKind]=useState('records'),[from,setFrom]=useState(filters.dateFrom || ''),[to,setTo]=useState(filters.dateTo || '');
  const pdf=useReportPdf(),id=useId();
  return <ModalShell open onClose={()=>{if(!pdf.exporting)onClose();}} busy={pdf.exporting} title="Export PDF Report" subtitle="Generate a report from saved data and applied filters." panelClassName="trace-modal-panel trace-admin-main-dialog max-w-lg" footer={<div className="trace-actions justify-end"><Button type="button" onClick={onClose} disabled={pdf.exporting} className="trace-button trace-button-secondary">Cancel</Button><Button type="submit" form={id} disabled={pdf.exporting || kind==='records'&&!recordsReady} className="trace-button trace-button-primary">{pdf.exporting?'Generating PDF…':'Download PDF'}</Button></div>}>
    <form id={id} aria-busy={pdf.exporting} className="space-y-4" onSubmit={async event=>{event.preventDefault();const query=kind==='records'?filters:{...(from?{dateFrom:from}:{}),...(to?{dateTo:to}:{})};if(await pdf.download(kind,query))onClose();}}>
      <label className="trace-label block">Report type<select value={kind} onChange={event=>setKind(event.target.value)} disabled={pdf.exporting} className="trace-control mt-1 w-full"><option value="records">Filtered document records</option><option value="efficiency">Document efficiency analytics</option><option value="support">Support analytics</option></select></label>
      {kind==='records'?<><p className="text-sm select-text">{scopeText}</p><p className="trace-page-description">Includes matching records, totals and status charts. The PDF includes all matching rows, up to 1,000. Narrow the filters for larger reports or use CSV.</p>{!recordsReady && <p role="status" className="trace-inline-error">Wait for the applied report to load before exporting records.</p>}</>:<>
        <div className="trace-form-grid"><label className="trace-label">From<input type="date" className="trace-control mt-1 w-full" value={from} disabled={pdf.exporting} onChange={event=>setFrom(event.target.value)}/></label><label className="trace-label">Through<input type="date" className="trace-control mt-1 w-full" value={to} min={from || undefined} disabled={pdf.exporting} onChange={event=>setTo(event.target.value)}/></label></div>
        <p className="trace-page-description">{kind==='support'?'Includes ticket summaries, charts, measured durations, FAQ feedback, staff workload and available analysis. Blank dates use the last 30 days.':'Includes completion times, stage waits, releases, all staff workload and available analysis. Blank dates use all recorded completion/desk history and the latest 30 days of releases.'} Dates use Manila time.</p>
      </>}
      <p className="trace-page-description">Generated with current saved values when downloaded. Missing measurements and unavailable analysis are labelled explicitly.</p>
      {pdf.error && <p role="alert" className="trace-inline-error">{pdf.error}</p>}
    </form>
  </ModalShell>;
}
