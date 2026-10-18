import { useState } from 'react';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard';
import InfoButton from '@/components/InfoButton';
import { demoOcrFieldDetection, ocrFieldDetection } from '@/utils/ocrFieldDetection';

export default function ScanFieldDetectionCard({ available, measurement }) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const metric = ocrFieldDetection(measurement);
  const measured = metric.samples > 0;
  const preview = includeDemo && available ? demoOcrFieldDetection(metric) : null;
  const recordedValue = measured ? `${metric.score.toFixed(1)}%` : 'Not measured';
  const value = !available ? 'Unavailable' : preview ? `${preview.score.toFixed(1)}%` : recordedValue;
  const info = <InfoButton title="About scan field detection">
    <p>Expected fields: Student ID, name and document type. Each document contributes its latest completed measurement. The score counts nonempty fields, not whether their values are correct.</p>
    <p>Average share of expected fields detected. This does not measure AI accuracy or correctness.</p>
    {available ? <>
      <p>{metric.samples} document {metric.samples === 1 ? 'scan' : 'scans'} measured with the current method.</p>
      <p>Recorded-only: {recordedValue}.</p>
      {(metric.unverified > 0 || metric.synthetic > 0) && <p>
        Excluded: {metric.unverified} historical/unverified scores; {metric.synthetic} marked synthetic scores.
      </p>}
      <p>Not measured means no qualifying samples. A completed scan that finds none of the three fields contributes 0%; a processing failure contributes no measurement.</p>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="trace-choice mt-1" checked={includeDemo} onChange={event => setIncludeDemo(event.target.checked)} />
        <span>Include 3 demo scans</span>
      </label>
      <p>Examples: 1/3, 2/3 and 3/3 fields detected. Together they give 66.7%; adding a recorded 100% scan gives 75% across four scans.</p>
      <p>Demo scans are examples only and are not saved. New measured scans affect both values when the dashboard refreshes.</p>
    </> : <p>Measurements are currently unavailable. Refresh the dashboard to try again.</p>}
  </InfoButton>;
  return <AdminMetricCard label="Scan Field Detection" value={value} icon="field-detection" solidHelper className="trace-admin-scan-metric" valueClassName={available && (measured || preview) ? '' : 'trace-admin-kpi-status'} labelAction={info} helper="Fields detected · not recognition accuracy">
    {available && <>
      {preview ? <div className="text-[0.625rem] text-trace-ink dark:text-gray-300" role="status">
        <p className="font-semibold">Demo preview: example + recorded data</p>
        <p>{preview.demoSamples} demo scans + {metric.samples} recorded {metric.samples === 1 ? 'scan' : 'scans'} ({preview.samples} total).</p>
        <p>Recorded-only: {recordedValue}.</p>
      </div> : <p className="text-[0.625rem] text-trace-ink dark:text-gray-300">{metric.samples} measured document {metric.samples === 1 ? 'scan' : 'scans'}</p>}
    </>}
  </AdminMetricCard>;
}
