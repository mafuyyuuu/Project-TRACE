import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRCode from 'qrcode';
import userEvent from '@testing-library/user-event';
import SubmissionQrPanel from '@/features/window1/components/SubmissionQrPanel';
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn() } }));
beforeEach(() => { QRCode.toDataURL.mockResolvedValue('data:image/png;base64,c3ludGhldGlj'); });
it('encodes only the displayed frontend origin and applicant choice, with downloadable QR', async () => {
  render(<SubmissionQrPanel />);
  await screen.findByRole('img', { name: 'TRACE student registration QR' });
  expect(QRCode.toDataURL).toHaveBeenCalledWith(`${window.location.origin}/signup?applicant=student`, expect.objectContaining({ width: 768, margin: 4 }));
  fireEvent.change(screen.getByLabelText('Applicant type'), { target: { value: 'alumni' } });
  await screen.findByRole('img', { name: 'TRACE alumni registration QR' });
  expect(screen.getByRole('link', { name: 'Download QR' })).toHaveAttribute('download', 'trace-alumni-registration-qr.png');
  expect(screen.getByRole('link', { name: 'Open registration form' })).toHaveAttribute('href', `${window.location.origin}/signup?applicant=alumni`);
});
it('opens a keyboard preview, traps focus, closes with Escape and restores the thumbnail focus', async () => {
  const user = userEvent.setup();
  render(<SubmissionQrPanel />);
  const preview = await screen.findByRole('button', { name: 'Preview student registration QR' });
  preview.focus();
  await user.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog', { name: 'Registration QR Preview' });
  expect(dialog).toContainElement(document.activeElement);
  expect(screen.getByRole('img', { name: 'Expanded TRACE student registration QR' })).toHaveAttribute('src', screen.getByRole('img', { name: 'TRACE student registration QR' }).src);
  expect(screen.getAllByRole('link', { name: 'Download QR' })).toHaveLength(2);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(preview).toHaveFocus();
});
it('discards late QR generation and does not preview or download the previous applicant', async () => {
  let finishStudent;
  QRCode.toDataURL.mockReturnValueOnce(new Promise(resolve => { finishStudent = resolve; }));
  render(<SubmissionQrPanel />);
  fireEvent.change(screen.getByLabelText('Applicant type'), { target: { value: 'alumni' } });
  await screen.findByRole('button', { name: 'Preview alumni registration QR' });
  finishStudent('data:image/png;base64,c3R1ZGVudA==');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Preview student registration QR' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Download QR' })).toHaveAttribute('download', 'trace-alumni-registration-qr.png');
});
it('keeps the usable URL when QR rendering fails', async () => {
  QRCode.toDataURL.mockRejectedValue(new Error('unavailable'));
  render(<SubmissionQrPanel />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Use the displayed registration link'));
  expect(screen.getByRole('link', { name: 'Open registration form' })).toHaveAttribute('href', `${window.location.origin}/signup?applicant=student`);
});
