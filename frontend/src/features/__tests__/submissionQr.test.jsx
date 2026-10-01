import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRCode from 'qrcode';
import SubmissionQrPanel from '@/features/window1/components/SubmissionQrPanel';
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn() } }));
beforeEach(() => { QRCode.toDataURL.mockResolvedValue('data:image/png;base64,c3ludGhldGlj'); });
it('encodes only the displayed frontend origin and applicant choice, with downloadable QR', async () => {
  render(<SubmissionQrPanel />);
  await screen.findByRole('img', { name: 'TRACE student registration QR' });
  expect(QRCode.toDataURL).toHaveBeenCalledWith(`${window.location.origin}/signup?applicant=student`, expect.any(Object));
  fireEvent.change(screen.getByLabelText('Applicant type'), { target: { value: 'alumni' } });
  await screen.findByRole('img', { name: 'TRACE alumni registration QR' });
  expect(screen.getByRole('link', { name: 'Download QR' })).toHaveAttribute('download', 'trace-alumni-registration-qr.png');
  expect(screen.getByRole('link', { name: /signup\?applicant=alumni/ })).toHaveAttribute('href', `${window.location.origin}/signup?applicant=alumni`);
});
it('keeps the usable URL when QR rendering fails', async () => {
  QRCode.toDataURL.mockRejectedValue(new Error('unavailable'));
  render(<SubmissionQrPanel />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Use the displayed registration link'));
  expect(screen.getByRole('link', { name: /signup/ })).toBeInTheDocument();
});
