import { useState } from 'react';
import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import UserGrid from '@/features/admin/components/UserGrid';
import UserDetailModal from '@/features/admin/components/UserDetailModal';
import api from '@/services/api';
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
const account = { id: 3, role: 'student', full_name: 'Synthetic Student', student_id: 'STU-TEST', is_active: 1,
  verification_status: 'pending', profile_picture: 'avatar-test.jpg', id_proof_path: '/uploads/proof-test.jpg',
  verification_reason: 'OCR could not read text from the proof. Manual review is required.' };
function Accounts() {
  const [selected, setSelected] = useState(null);
  return <><UserGrid users={[account]} searchValue="" onSearchChange={() => {}} roleOptions={[]} onRoleFilterChange={() => {}} onSelectUser={setSelected} />
    <UserDetailModal open={!!selected} user={selected} viewerId={1} onClose={() => setSelected(null)} /></>;
}
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ data: new Blob(['synthetic'], { type: 'image/jpeg' }) }); });
it('shows the account-list avatar and protected proof when a Maintenance card opens', async () => {
  render(<Accounts />);
  expect(await screen.findByAltText('Synthetic Student')).toHaveAttribute('src', expect.stringContaining('blob:'));
  fireEvent.click(screen.getByTestId('user-card'));
  const modal = screen.getByRole('dialog', { name: 'Synthetic Student' });
  expect(await within(modal).findByAltText('Registration Identity Proof preview')).toHaveAttribute('src', expect.stringContaining('blob:'));
  expect(api.get).toHaveBeenCalledWith('/files/avatar-test.jpg', { responseType: 'blob' });
  expect(api.get).toHaveBeenCalledWith('/files/proof-test.jpg', { responseType: 'blob' });
  expect(within(modal).queryByLabelText('Registration Identity Proof', { selector: 'input' })).not.toBeInTheDocument();
  expect(within(modal).getByRole('region', { name: 'Registration review reason' })).toHaveTextContent(account.verification_reason);
  const preview = within(modal).getByRole('button', { name: 'Preview Registration Identity Proof' });
  preview.focus(); fireEvent.click(preview);
  const viewer = screen.getByRole('dialog', { name: 'Document preview' });
  expect(await within(viewer).findByRole('link', { name: 'Download file' })).toHaveAttribute('download', 'proof-test.jpg');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(modal).toBeInTheDocument();
  expect(preview).toHaveFocus();
});
it('labels legacy pending records as unknown rather than inventing an OCR finding', () => {
  render(<UserDetailModal open user={{ ...account, verification_reason: null }} onClose={() => {}} />);
  expect(screen.getByRole('region', { name: 'Registration review reason' })).toHaveTextContent('reason was not recorded');
});
