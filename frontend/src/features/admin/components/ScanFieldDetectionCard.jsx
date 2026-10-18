import { useState } from 'react';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard';
import { demoOcrFieldDetection, ocrFieldDetection } from '@/utils/ocrFieldDetection';

export default function ScanFieldDetectionCard({ available, measurement }) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const metric = ocrFieldDetection(measurement);
  const measured = metric.samples > 0;
  const preview = includeDemo && available ? demoOcrFieldDetection(metric) : null;
  const recordedValue = measured ? `${metric.score.toFixed(1)}%` : 'Not measured';
  const value = !available ? 'Unavailable' : preview ? `${preview.score.toFixed(1)}%` : recordedValue;
  return <AdminMetricCard label="Scan Field Detection" value={value} icon="field-detection" solidHelper className="trace-admin-scan-metric" valueClassName={available && (measured || preview) ? '' : 'trace-admin-kpi-status'} helper="Average share of expected fields detected. This does not measure AI accuracy or correctness.">
    <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">Expected fields: Student ID, name and document type.</p>
    {available && <>
      {preview && <div className="mt-2 text-[0.625rem] text-trace-ink dark:text-gray-300" role="status">
        <p className="font-semibold">Demo preview: example + recorded data</p>
        <p>{preview.demoSamples} demo scans + {metric.samples} recorded {metric.samples === 1 ? 'scan' : 'scans'} ({preview.samples} total).</p>
        <p>Recorded-only: {recordedValue}.</p>
        <p>Examples: 1/3, 2/3 and 3/3 fields detected.</p>
      </div>}
      <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">{metric.samples} document {metric.samples === 1 ? 'scan' : 'scans'} measured with the current method.</p>
      {(metric.unverified > 0 || metric.synthetic > 0) && <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">
        Excluded: {metric.unverified} historical/unverified scores; {metric.synthetic} marked synthetic scores.
      </p>}
      {!measured && <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">A completed intake scan measured with the current method is needed.</p>}
      <label className="mt-3 flex items-start gap-2 text-[0.625rem] text-trace-ink dark:text-gray-300">
        <input type="checkbox" className="trace-choice mt-1" checked={includeDemo} onChange={event => setIncludeDemo(event.target.checked)} />
        <span>Include 3 demo scans</span>
      </label>
      {preview && <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">Demo scans are examples only and are not saved. New measured scans affect both values when the dashboard refreshes.</p>}
    </>}
  </AdminMetricCard>;
}
