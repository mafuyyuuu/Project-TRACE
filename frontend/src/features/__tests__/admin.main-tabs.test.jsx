import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationProof from '@/components/RegistrationProof';
import AdminSupportSettingsForm from '@/components/AdminSupportSettingsForm';
import AdminRegistrationDetails from '@/features/admin/components/AdminRegistrationDetails';
import AccountVerificationModal from '@/features/admin/components/AccountVerificationModal';
import UserDetailModal from '@/features/admin/components/UserDetailModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import useAuthedFile from '@/hooks/useAuthedFile';
import { getAuthenticator } from '@/services/authenticatorService';

vi.mock('@/hooks/useAuthedFile', () => ({ default: vi.fn(), toFilename: path => path ? path.split('/').pop() : null }));
vi.mock('@/services/authenticatorService', () => ({ getAuthenticator: vi.fn(), beginAuthenticator: vi.fn(), updateAuthenticator: vi.fn() }));
vi.mock('@/services/authService', () => ({ getSecurityLogs: vi.fn().mockResolvedValue([]), endOtherSessions: vi.fn() }));

const config = { weekdays: [1, 2, 3, 4], open_minute: 480, close_minute: 960, closed_dates: [], warning_minutes: 3, timeout_minutes: 5 };
const student = { id: 9, role: 'student', full_name: 'Synthetic Applicant', student_id: 'TEST-0009', program: 'BSIT', college_name: 'Synthetic College', email: 'student@example.test' };

beforeEach(() => {
  vi.clearAllMocks();
  useAuthedFile.mockReturnValue({ url: 'blob:synthetic-proof', loading: false, error: '' });
  getAuthenticator.mockResolvedValue({ available: true, enabled: false, recovery_codes_remaining: 0 });
});

describe('Main Tabs dialog interactions', () => {
  it('zooms and rotates the protected proof, opens its viewer and restores the trigger on Escape', async () => {
    const user = userEvent.setup();
    render(<RegistrationProof path="proof-test.png" label="ID Proof" review />);
    const image = screen.getByAltText('ID Proof preview');
    await user.click(screen.getByRole('button', { name: 'Zoom in proof' }));
    await user.click(screen.getByRole('button', { name: 'Rotate proof' }));
    expect(image.style.transform).toBe('scale(1.25) rotate(90deg)');
    const trigger = screen.getByRole('button', { name: 'Open full preview' });
    await user.click(trigger);
    const viewer = screen.getByRole('dialog', { name: 'Document preview' });
    expect(within(viewer).getByRole('link', { name: 'Download file' })).toHaveAttribute('href', 'blob:synthetic-proof');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps image transforms disabled for PDF proof while allowing the protected full viewer', async () => {
    render(<RegistrationProof path="proof-test.pdf" label="ID Proof" review />);
    expect(screen.getByRole('button', { name: 'Zoom in proof' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rotate proof' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Open PDF proof' }));
    expect(within(screen.getByRole('dialog')).getByTitle('PDF Viewer')).toHaveAttribute('src', 'blob:synthetic-proof');
  });

  it('shows only saved individual OCR checks and keeps aggregate or missing results unknown', () => {
    const { rerender } = render(<AdminRegistrationDetails student={{ ...student, verification_reason: 'OCR read the school and student ID, but could not confirm the selected college. Manual review is required.' }} />);
    expect(screen.getAllByText('Read')).toHaveLength(2);
    expect(screen.getByText('Not confirmed')).toBeInTheDocument();
    rerender(<AdminRegistrationDetails student={{ ...student, verification_reason: 'OCR could not confirm the school, student ID and college together. Manual review is required.' }} />);
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not recorded')).toHaveLength(4);
  });

  it('stages a review decision and keeps the evidence draft when confirmation is canceled', async () => {
    const confirm = vi.fn();
    render(<AccountVerificationModal studentVerifyToConfirm={{ student: { ...student, registration_proof_unavailable: 1, registration_proof_reason: 'No image available.' } }} confirmAdminVerifyStudent={confirm} cancelAdminVerifyStudent={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Record the evidence');
    const basis = screen.getByRole('textbox', { name: 'Identity Review Evidence / Decision Basis' });
    await userEvent.type(basis, 'Checked institutional records.');
    await userEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Verify Account' })).getByRole('button', { name: 'Cancel' }));
    expect(basis).toHaveValue('Checked institutional records.');
  });

  it('adds and removes closed dates locally, then stages the unchanged settings contract', async () => {
    const stage = vi.fn();
    render(<AdminSupportSettingsForm config={config} onStage={stage} busy={false} />);
    fireEvent.change(screen.getByLabelText('Select closed date'), { target: { value: '2026-12-25' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add date' }));
    expect(stage).not.toHaveBeenCalled();
    expect(screen.getByText('2026-12-25')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove closed date 2026-12-25' }));
    expect(screen.queryByText('2026-12-25')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Select closed date'), { target: { value: '2026-12-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add date' }));
    fireEvent.submit(document.getElementById('support-settings-form'));
    expect(stage).toHaveBeenCalledExactlyOnceWith({ kind: 'settings', settings: { ...config, closed_dates: ['2026-12-31'] } });
  });

  it('rejects invalid reply clocks and hours before staging settings', () => {
    const stage = vi.fn();
    render(<AdminSupportSettingsForm config={config} onStage={stage} busy={false} />);
    fireEvent.change(screen.getByLabelText('Reply Warning (Service Minutes)'), { target: { value: '6' } });
    fireEvent.submit(document.getElementById('support-settings-form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Warning must come before timeout');
    fireEvent.change(screen.getByLabelText('Reply Warning (Service Minutes)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Opening Time'), { target: { value: '17:00' } });
    fireEvent.submit(document.getElementById('support-settings-form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Opening time must come before closing time');
    expect(stage).not.toHaveBeenCalled();
  });

  it('keeps the Admin profile summary outside the scrolling body and retains both tabs and save confirmation', async () => {
    const close = vi.fn(), save = vi.fn();
    render(<ProfileSettingsModal user={{ id: 1, role: 'admin', full_name: 'Synthetic Admin', student_id: 'TEST-ADMIN', email: 'admin@example.test' }} profileData={{ phone_number: '+639171234567', email: 'admin@example.test', password: '' }} setField={vi.fn()} onClose={close} onSave={save} onAvatarChange={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Edit Profile' });
    expect(dialog.querySelector('.trace-modal-body')).not.toContainElement(screen.getByText('Synthetic Admin'));
    await userEvent.click(screen.getByRole('button', { name: 'Security', exact: true }));
    expect(screen.getByRole('button', { name: 'Security', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Not enabled')).toBeInTheDocument();
    const newPassword = screen.getByLabelText('New Password');
    expect(newPassword).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show new password' }));
    expect(newPassword).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Current Password')).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide passwords' }));
    expect(newPassword).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'View activity' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'View activity' }));
    expect(screen.getByRole('button', { name: 'Hide activity' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.submit(document.getElementById('profile-settings-form'));
    expect(screen.getByRole('dialog', { name: 'Confirm Profile Save' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});

it.each([false, true])('shows saved Year Level/Section in the authorized student information layout (Admin=%s)', adminLayout => {
  const { rerender } = render(<UserDetailModal open adminLayout={adminLayout} user={{ ...student, user_type: 'student', year_level: '3rd Year', section: 'IT-3B' }} onClose={vi.fn()} />);
  expect(screen.getByText('Year Level', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('3rd Year')).toBeInTheDocument();
  expect(screen.getByText('Section', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('IT-3B')).toBeInTheDocument();
  expect(screen.queryByText('PLP/College Year Graduated')).not.toBeInTheDocument();
  rerender(<UserDetailModal open adminLayout={adminLayout} user={{ ...student, user_type: 'alumni', graduation_year: 2024 }} onClose={vi.fn()} />);
  expect(screen.queryByText('Year Level', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Section', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByText('PLP/College Year Graduated')).toBeInTheDocument();
});
