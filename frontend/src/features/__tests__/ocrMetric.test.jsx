import { fireEvent, render, screen, within } from '@testing-library/react';
import { it, expect } from 'vitest';
import ScanFieldDetectionCard from '@/features/admin/components/ScanFieldDetectionCard';

const measurement = (score, samples) => ({ method: 'intake_fields_v1', score, samples, unverified_samples: 2, synthetic_samples: 1 });
const openInfo = () => { fireEvent.click(screen.getByRole('button', { name: 'About scan field detection' })); return screen.getByRole('dialog', { name: 'About scan field detection' }); };
const closeInfo = () => fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close', exact: true }));
const enableDemo = () => { openInfo(); fireEvent.click(screen.getByRole('checkbox', { name: 'Include 3 demo scans' })); closeInfo(); };

it('keeps the card compact and reveals methodology and exclusions on request', () => {
  render(<ScanFieldDetectionCard available measurement={measurement(null, 0)} />);
  expect(screen.getByText('Not measured')).toBeVisible();
  expect(screen.getByText('0 measured document scans')).toBeVisible();
  expect(screen.queryByText(/historical\/unverified scores/)).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  const info = openInfo();
  expect(within(info).getByText(/2 historical\/unverified scores; 1 marked synthetic scores/)).toBeVisible();
  expect(within(info).getByText(/does not measure AI accuracy or correctness/)).toBeVisible();
  expect(within(info).getByText(/processing failure contributes no measurement/)).toBeVisible();
  closeInfo();
  expect(screen.getByRole('button', { name: 'About scan field detection' })).toHaveAttribute('aria-expanded', 'false');
});
it('shows measured zero distinctly from no samples', () => {
  render(<ScanFieldDetectionCard available measurement={measurement(0, 1)} />);
  expect(screen.getByText('0.0%')).toBeVisible();
  expect(screen.getByText('1 measured document scan')).toBeVisible();
  expect(screen.queryByText('Not measured')).not.toBeInTheDocument();
});
it('shows current field detection with its measured sample count', () => {
  render(<ScanFieldDetectionCard available measurement={measurement(200 / 3, 3)} />);
  expect(screen.getByText('66.7%')).toBeVisible();
  expect(screen.getByText('3 measured document scans')).toBeVisible();
  expect(screen.getByText('Fields detected · not recognition accuracy')).toBeVisible();
});
it('does not reuse an old API average or turn an outage into an empty measurement', () => {
  const { rerender } = render(<ScanFieldDetectionCard available />);
  expect(screen.getByText('Not measured')).toBeVisible();
  rerender(<ScanFieldDetectionCard available={false} measurement={measurement(100, 1)} />);
  expect(screen.getByText('Unavailable')).toBeVisible();
  expect(screen.queryByText('100.0%')).not.toBeInTheDocument();
  openInfo();
  expect(screen.getByText(/Measurements are currently unavailable/)).toBeVisible();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
it('rejects an older unversioned score even when a sample count is supplied', () => {
  render(<ScanFieldDetectionCard available measurement={{ score: 45, samples: 2 }} />);
  expect(screen.getByText('Not measured')).toBeVisible();
  openInfo();
  expect(screen.getByText(/2 historical\/unverified scores/)).toBeVisible();
  expect(screen.queryByText('45.0%')).not.toBeInTheDocument();
});
it('keeps demo provenance and the recorded-only result visible after closing info', () => {
  render(<ScanFieldDetectionCard available measurement={{ score: 45, samples: 2 }} />);
  openInfo();
  const toggle = screen.getByRole('checkbox', { name: 'Include 3 demo scans' });
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  closeInfo();
  expect(screen.getByText('66.7%')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Demo preview: example + recorded data');
  expect(screen.getByText('3 demo scans + 0 recorded scans (3 total).')).toBeVisible();
  expect(screen.getByText('Recorded-only: Not measured.')).toBeVisible();
  openInfo();
  expect(screen.getByRole('checkbox', { name: 'Include 3 demo scans' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include 3 demo scans' }));
  closeInfo();
  expect(screen.getByText('Not measured')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('weights fresh measurements by sample counts while the info dialog is closed', () => {
  const { rerender } = render(<ScanFieldDetectionCard available measurement={measurement(null, 0)} />);
  enableDemo();
  rerender(<ScanFieldDetectionCard available measurement={measurement(100, 1)} />);
  expect(screen.getByText('75.0%')).toBeVisible();
  expect(screen.getByText('Recorded-only: 100.0%.')).toBeVisible();
  expect(screen.getByText('3 demo scans + 1 recorded scan (4 total).')).toBeVisible();
  rerender(<ScanFieldDetectionCard available measurement={measurement(0, 1)} />);
  expect(screen.getByText('50.0%')).toBeVisible();
  rerender(<ScanFieldDetectionCard available measurement={measurement(100, 6)} />);
  expect(screen.getByText('88.9%')).toBeVisible();
});
it('shows an outage instead of retaining a demo percentage', () => {
  const { rerender } = render(<ScanFieldDetectionCard available measurement={measurement(100, 1)} />);
  enableDemo();
  expect(screen.getByText('75.0%')).toBeVisible();
  rerender(<ScanFieldDetectionCard available={false} measurement={measurement(100, 1)} />);
  expect(screen.getByText('Unavailable')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
