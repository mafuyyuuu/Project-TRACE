import Button from '@/components/Button';
import DashboardAlerts from '@/components/DashboardAlerts';
import AdminIcon from '@/features/admin/components/AdminIcon';
import useReportPdf from '@/hooks/useReportPdf';
export default function PdfExportButton({kind,filters,disabled=false}) {
  const pdf=useReportPdf();
  return <>
    <Button type="button" disabled={disabled || pdf.exporting} onClick={()=>void pdf.download(kind,filters)} className="trace-button trace-button-secondary" aria-busy={pdf.exporting}><AdminIcon name="download" className="brightness-0 dark:invert" />{pdf.exporting?'Generating PDF…':'Export PDF'}</Button>
    <DashboardAlerts error={pdf.error} success={pdf.success} onDismiss={pdf.dismiss}/>
  </>;
}
