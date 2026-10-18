import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import ScanFieldDetectionCard from '@/features/admin/components/ScanFieldDetectionCard';

it('excludes old scores and explains an unmeasured state with the sample count', () => {
  render(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: null, samples: 0, unverified_samples: 2, synthetic_samples: 0 }} />);
  expect(screen.getByText('Not measured')).toBeVisible();
  expect(screen.getByText('0 document scans measured with the current method.')).toBeVisible();
  expect(screen.getByText(/2 historical\/unverified scores/)).toBeVisible();
  expect(screen.queryByText('45.0%')).not.toBeInTheDocument();
});
it('shows a real zero as zero with its measured denominator', () => {
  render(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: 0, samples: 1, unverified_samples: 0, synthetic_samples: 0 }} />);
  expect(screen.getByText('0.0%')).toBeVisible();
  expect(screen.getByText('1 document scan measured with the current method.')).toBeVisible();
  expect(screen.queryByText('Not measured')).not.toBeInTheDocument();
});
it('shows current field detection without claiming value correctness', () => {
  render(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: 200 / 3, samples: 3, unverified_samples: 0, synthetic_samples: 1 }} />);
  expect(screen.getByText('66.7%')).toBeVisible();
  expect(screen.getByText(/1 marked synthetic scores/)).toBeVisible();
  expect(screen.getByText(/does not measure AI accuracy or correctness/)).toBeVisible();
});
it('does not reuse an old API average or turn an outage into an empty measurement', () => {
  const { rerender } = render(<ScanFieldDetectionCard available />);
  expect(screen.getByText('Not measured')).toBeVisible();
  rerender(<ScanFieldDetectionCard available={false} measurement={{ method: 'intake_fields_v1', score: 100, samples: 1 }} />);
  expect(screen.getByText('Unavailable')).toBeVisible();
  expect(screen.queryByText('100.0%')).not.toBeInTheDocument();
});

it('rejects an older unversioned score even if a sample count is supplied', () => {
  render(<ScanFieldDetectionCard available measurement={{ score: 45, samples: 2 }} />);
  expect(screen.getByText('Not measured')).toBeVisible();
  expect(screen.getByText(/2 historical\/unverified scores/)).toBeVisible();
  expect(screen.getByText('0 document scans measured with the current method.')).toBeVisible();
});

it('offers an opt-in labeled demo while preserving the recorded-only result', () => {
  render(<ScanFieldDetectionCard available measurement={{ score: 45, samples: 2 }} />);
  const toggle = screen.getByRole('checkbox', { name: 'Include 3 demo scans' });
  expect(toggle).not.toBeChecked();
  expect(screen.queryByText('66.7%')).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(screen.getByText('66.7%')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Demo preview: example + recorded data');
  expect(screen.getByText('3 demo scans + 0 recorded scans (3 total).')).toBeVisible();
  expect(screen.getByText('Recorded-only: Not measured.')).toBeVisible();
  expect(screen.getByText(/Demo scans are examples only and are not saved/)).toBeVisible();
  expect(screen.queryByText('45.0%')).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(screen.getByText('Not measured')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('weights newly loaded scans by their sample counts and restores the recorded-only value', () => {
  const { rerender } = render(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: null, samples: 0 }} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include 3 demo scans' }));
  rerender(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: 100, samples: 1 }} />);
  expect(screen.getByText('75.0%')).toBeVisible();
  expect(screen.getByText('Recorded-only: 100.0%.')).toBeVisible();
  expect(screen.getByText('3 demo scans + 1 recorded scan (4 total).')).toBeVisible();
  rerender(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: 0, samples: 1 }} />);
  expect(screen.getByText('50.0%')).toBeVisible();
  expect(screen.getByText('Recorded-only: 0.0%.')).toBeVisible();
  rerender(<ScanFieldDetectionCard available measurement={{ method: 'intake_fields_v1', score: 100, samples: 6 }} />);
  expect(screen.getByText('88.9%')).toBeVisible();
  expect(screen.getByText('3 demo scans + 6 recorded scans (9 total).')).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include 3 demo scans' }));
  expect(screen.getByText('100.0%')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows an outage instead of retaining a demo percentage', () => {
  const measurement = { method: 'intake_fields_v1', score: 100, samples: 1 };
  const { rerender } = render(<ScanFieldDetectionCard available measurement={measurement} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include 3 demo scans' }));
  expect(screen.getByText('75.0%')).toBeVisible();
  rerender(<ScanFieldDetectionCard available={false} measurement={measurement} />);
  expect(screen.getByText('Unavailable')).toBeVisible();
  expect(screen.queryByText('75.0%')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
