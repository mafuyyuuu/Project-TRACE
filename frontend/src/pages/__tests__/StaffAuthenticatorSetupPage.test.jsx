import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffAuthenticatorSetupPage from '@/pages/StaffAuthenticatorSetupPage';
import StaffAuthenticatorSetup from '@/features/admin/components/StaffAuthenticatorSetup';
import * as service from '@/services/staffAuthenticatorSetupService';
vi.mock('@/services/staffAuthenticatorSetupService', () => ({ startStaffSetup: vi.fn(), confirmStaffSetup: vi.fn(), issueStaffSetup: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,cXI=') } }));
const grant = 'b'.repeat(64);
const setup = { secret: 'MANUALKEY', provisioning_uri: 'otpauth://totp/TRACE?secret=MANUALKEY', expires_at: new Date(Date.now() + 600000).toISOString() };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  service.startStaffSetup.mockResolvedValue(setup);
  service.confirmStaffSetup.mockResolvedValue({ token: 'verified-session', user: { id: 3, role: 'clerk' }, enabled: true, recovery_codes: ['RECOVERY-ONE', 'RECOVERY-TWO'] });
});
function openPage() { render(<MemoryRouter><StaffAuthenticatorSetupPage /></MemoryRouter>); }
async function begin() {
  fireEvent.change(screen.getByLabelText('Staff ID'), { target: { value: 'FINANCE001' } });
  fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'staff-password' } });
  fireEvent.change(screen.getByLabelText('Admin setup code'), { target: { value: grant } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify staff setup' }));
  await screen.findByLabelText('Authenticator code');
}
it('requires private credentials and app confirmation before storing a full session, then shows recovery codes', async () => {
  openPage(); await begin();
  expect(service.startStaffSetup).toHaveBeenCalledExactlyOnceWith({ employee_id: 'FINANCE001', password: 'staff-password', setup_code: grant, code: '' });
  expect(localStorage.getItem('trace_token')).toBeNull();
  expect(await screen.findByAltText('Staff authenticator setup QR')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  expect(service.confirmStaffSetup).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Enable Staff Authenticator' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Enable authenticator' }));
  await screen.findByRole('list', { name: 'Recovery codes' });
  expect(localStorage.getItem('trace_token')).toBe('verified-session');
  expect(screen.getByText('RECOVERY-ONE')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'I saved my recovery codes — Continue' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Staff password')).not.toBeInTheDocument();
});
it('preserves credentials on setup failure and does not accept duplicate pending submissions', async () => {
  let reject;
  service.startStaffSetup.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  openPage();
  fireEvent.change(screen.getByLabelText('Staff ID'), { target: { value: 'FINANCE001' } });
  fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'staff-password' } });
  fireEvent.change(screen.getByLabelText('Admin setup code'), { target: { value: grant } });
  const form = screen.getByLabelText('Staff ID').closest('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(service.startStaffSetup).toHaveBeenCalledOnce();
  reject({ response: { data: { error: 'Setup expired.' } } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Setup expired.');
  expect(screen.getByLabelText('Staff password')).toHaveValue('staff-password');
  expect(localStorage.getItem('trace_token')).toBeNull();
});
it('preserves pending app setup on rejected confirmation without saving a session', async () => {
  service.confirmStaffSetup.mockRejectedValue({ response: { data: { error: 'Invalid code.' } } });
  openPage(); await begin();
  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enable authenticator' }));
  await waitFor(() => expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Invalid code.'));
  expect(localStorage.getItem('trace_token')).toBeNull();
  expect(screen.getByLabelText('Authenticator code')).toHaveValue('123456');
});
it('requires named Admin confirmation, then shows a private code without placing it in a URL', async () => {
  service.issueStaffSetup.mockResolvedValue({ setup_code: grant, expires_at: setup.expires_at, staff_id: 'FINANCE001' });
  render(<StaffAuthenticatorSetup user={{ id: 3, full_name: 'Finance Clerk', student_id: 'FINANCE001' }} />);
  fireEvent.change(screen.getByLabelText('Admin password for staff setup'), { target: { value: 'admin-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Issue private setup code' }));
  expect(service.issueStaffSetup).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toHaveTextContent('Finance Clerk (FINANCE001)');
  fireEvent.click(screen.getByRole('button', { name: 'Issue setup code' }));
  expect(await screen.findByLabelText('Private staff setup code')).toHaveTextContent(grant);
  expect(service.issueStaffSetup).toHaveBeenCalledExactlyOnceWith(3, 'admin-password');
  expect(screen.getByRole('link')).toHaveAttribute('href', '/staff-setup');
  fireEvent.click(screen.getByRole('button', { name: 'Hide setup code' }));
  expect(screen.queryByText(grant)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Admin password for staff setup')).toHaveValue('');
});
