import { useState } from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationProof from '@/components/RegistrationProof';
import ImageViewerModal from '@/components/ImageViewerModal';
import ModalShell from '@/components/ModalShell';
import AccountVerificationModal from '@/features/admin/components/AccountVerificationModal';
import api from '@/services/api';

vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
beforeEach(() => {
  let serial = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:synthetic-${++serial}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  api.get.mockResolvedValue({ data: new Blob(['SYNTHETIC TEST FILE'], { type: 'image/png' }) });
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

it('uses authenticated bytes even for a stored absolute URL and groups preview/download', async () => {
  render(<RegistrationProof path="https://example.test/uploads/proof-test.png" />);
  const image = await screen.findByAltText('Registration Identity Proof preview');
  expect(image).toHaveAttribute('src', 'blob:synthetic-1');
  expect(image).toHaveClass('object-contain');
  expect(api.get).toHaveBeenCalledWith('/files/proof-test.png', { responseType: 'blob' });
  expect(screen.getByRole('link', { name: 'Download proof' })).toHaveAttribute('href', 'blob:synthetic-1');
  expect(screen.getByRole('link', { name: 'Download proof' })).toHaveAttribute('download', 'proof-test.png');
  expect(screen.getByRole('button', { name: 'Preview Registration Identity Proof' })).toHaveAttribute('type', 'button');
  expect(document.querySelector('input[type=file]')).toBeNull();
});

it('opens with the keyboard, traps focus and restores it on Escape without closing its parent', async () => {
  const user = userEvent.setup(), onClose = vi.fn();
  render(<ModalShell open title="Edit Profile" onClose={onClose}><RegistrationProof path="proof-test.png" /></ModalShell>);
  const trigger = await screen.findByRole('button', { name: 'Preview Registration Identity Proof' });
  trigger.focus();
  await user.keyboard('{Enter}');
  const viewer = screen.getByRole('dialog', { name: 'Document preview' });
  expect(await within(viewer).findByAltText('Full Screen Viewer')).toHaveAttribute('src', 'blob:synthetic-2');
  const download = within(viewer).getByRole('link', { name: 'Download file' });
  expect(download).toHaveAttribute('download', 'proof-test.png');
  download.focus(); await user.tab();
  expect(within(viewer).getByRole('button', { name: 'Close' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: 'Document preview' })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus(); expect(onClose).not.toHaveBeenCalled();
  await user.keyboard(' ');
  expect(screen.getByRole('dialog', { name: 'Document preview' })).toBeInTheDocument();
  await user.click(within(screen.getByRole('dialog', { name: 'Document preview' })).getByRole('button', { name: 'Close' }));
  expect(trigger).toHaveFocus();
});

it('provides PDF preview and download without exposing a public URL', async () => {
  const user = userEvent.setup();
  render(<RegistrationProof path="/uploads/proof-test.pdf" />);
  await user.click(await screen.findByRole('button', { name: 'Preview Registration Identity Proof' }));
  const pdf = await screen.findByTitle('PDF Viewer');
  await waitFor(() => expect(pdf).toHaveAttribute('src', 'blob:synthetic-2'));
  expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute('download', 'proof-test.pdf');
});

it.each([403, 500])('shows safe file errors without preview/download on HTTP %s', async status => {
  api.get.mockRejectedValue({ response: { status } });
  render(<RegistrationProof path="proof-test.png" />);
  expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ? 'You do not have access' : 'Failed to load');
  expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('shows loading and missing-proof states without creating inactive controls', () => {
  api.get.mockReturnValue(new Promise(() => {}));
  const { rerender } = render(<RegistrationProof path="proof-test.png" />);
  expect(screen.getByText('Loading uploaded file…')).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<RegistrationProof path={null} />);
  expect(screen.getByText('No registration proof uploaded.')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('keeps the large viewer dismissible while loading or denied, without a stale download', async () => {
  api.get.mockReturnValueOnce(new Promise(() => {}));
  const close = vi.fn();
  const { rerender } = render(<ImageViewerModal viewImageUrl="loading.png" setViewImageUrl={close} />);
  expect(screen.getByText('Loading document…')).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  api.get.mockRejectedValueOnce({ response: { status: 403 } });
  rerender(<ImageViewerModal viewImageUrl="denied.png" setViewImageUrl={close} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have access');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  await userEvent.setup().keyboard('{Escape}');
  expect(close).toHaveBeenCalledWith(null);
});

it('hides the old lightbox and revokes its bytes when the proof changes', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<RegistrationProof path="old.png" />);
  await user.click(await screen.findByRole('button', { name: 'Preview Registration Identity Proof' }));
  await screen.findByAltText('Full Screen Viewer');
  rerender(<RegistrationProof path="new.png" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(await screen.findByAltText('Registration Identity Proof preview')).toHaveAttribute('src', 'blob:synthetic-3');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-1');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-2');
});

function AdminReview() {
  const [preview, setPreview] = useState(null);
  return <><AccountVerificationModal studentVerifyToConfirm={{ student: { full_name: 'Synthetic Applicant', id_proof_path: '/uploads/proof-test.png' } }}
    cancelAdminVerifyStudent={() => {}} confirmAdminVerifyStudent={() => {}} setViewImageUrl={setPreview} />
    <ImageViewerModal viewImageUrl={preview} setViewImageUrl={setPreview} /></>;
}
it('connects Admin review to the same protected lightbox and restores the review trigger', async () => {
  const user = userEvent.setup();
  render(<AdminReview />);
  const trigger = await screen.findByRole('button', { name: 'Preview ID Proof' });
  await user.click(trigger);
  expect(await screen.findByAltText('Full Screen Viewer')).toHaveAttribute('src', 'blob:synthetic-2');
  await user.keyboard('{Escape}');
  expect(screen.getByRole('dialog', { name: 'Review Registration' })).toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
