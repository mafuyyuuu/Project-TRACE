import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import * as api from '@/services/authenticatorService';
import { downloadRecoveryCodes } from '@/utils/downloadRecoveryCodes';
vi.mock('@/services/authenticatorService', () => ({ getAuthenticator: vi.fn(), beginAuthenticator: vi.fn(), updateAuthenticator: vi.fn() }));
vi.mock('@/services/realtimeService', () => ({ disconnectRealtime: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,synthetic') } }));
vi.mock('@/utils/downloadRecoveryCodes', () => ({ downloadRecoveryCodes: vi.fn() }));
const user = { id: 3, role: 'student' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  downloadRecoveryCodes.mockReset();
  api.getAuthenticator.mockResolvedValue({ enabled: false, available: true });
  api.beginAuthenticator.mockResolvedValue({ secret: 'MANUAL-SETUP', provisioning_uri: 'otpauth://totp/TRACE:test' });
  api.updateAuthenticator.mockResolvedValue({ token: 'synthetic', user, enabled: true, recovery_codes: ['SINGLE-USE-CODE'] });
});
afterEach(() => vi.unstubAllGlobals());

async function showRecoveryCodes() {
  render(<AuthenticatorSettings user={{ ...user, role: 'admin' }} />);
  fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'synthetic' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator app' }));
  fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }));
  await screen.findByText('SINGLE-USE-CODE');
}

it('announces copy completion accessibly and preserves explicit save acknowledgment', async () => {
  let resolve;
  const writeText = vi.fn(() => new Promise(done => { resolve = done; }));
  await showRecoveryCodes();
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  fireEvent.click(screen.getByRole('button', { name: 'Copy recovery codes' }));
  expect(screen.getByRole('button', { name: 'Copying recovery codes…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download recovery codes' })).toBeDisabled();
  expect(screen.queryByText(/Recovery codes copied/)).not.toBeInTheDocument();
  resolve();
  const notice = await screen.findByText(/Recovery codes copied/);
  expect(notice).toHaveAttribute('role', 'status');
  expect(notice).toHaveAttribute('aria-atomic', 'true');
  expect(screen.getByText('SINGLE-USE-CODE')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'I saved my recovery codes' }));
  expect(screen.queryByText('SINGLE-USE-CODE')).not.toBeInTheDocument();
  expect(screen.queryByText(/Recovery codes copied/)).not.toBeInTheDocument();
});

it('announces clipboard errors with a usable alternative and retains codes', async () => {
  await showRecoveryCodes();
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
  fireEvent.click(screen.getByRole('button', { name: 'Copy recovery codes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Allow clipboard access.*download/);
  expect(screen.getByRole('button', { name: 'Copy recovery codes' })).toBeEnabled();
  expect(screen.getByText('SINGLE-USE-CODE')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Download recovery codes' }));
  const notice = screen.getByText(/download started/);
  expect(notice).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(downloadRecoveryCodes).toHaveBeenCalledExactlyOnceWith(['SINGLE-USE-CODE']);
  expect(screen.getByText('SINGLE-USE-CODE')).toBeInTheDocument();
});
it('activates only after confirmed verification and shows recovery codes once', async () => {
  const interaction = userEvent.setup(); render(<AuthenticatorSettings user={user} />);
  await interaction.type(await screen.findByLabelText('Current password'), 'synthetic');
  await interaction.click(screen.getByRole('button', { name: 'Set up authenticator app' }));
  expect(await screen.findByAltText(/Scan to set up/)).toBeInTheDocument();
  expect(screen.getByText('MANUAL-SETUP')).toBeInTheDocument();
  await interaction.type(screen.getByLabelText('Authenticator code'), '123456');
  await interaction.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  expect(api.updateAuthenticator).not.toHaveBeenCalled();
  const confirmation = screen.getByRole('dialog', { name: 'Confirm authenticator change' });
  await interaction.click(within(confirmation).getByRole('button', { name: 'Confirm change' }));
  expect(await screen.findByText('SINGLE-USE-CODE')).toBeInTheDocument();
  expect(api.updateAuthenticator).toHaveBeenCalledWith('enable', { current_password: 'synthetic', code: '123456' });
  await interaction.click(screen.getByRole('button', { name: 'I saved my recovery codes' }));
  expect(screen.queryByText('SINGLE-USE-CODE')).not.toBeInTheDocument();
});
it('explains unavailable server configuration without offering a fake enable control', async () => {
  api.getAuthenticator.mockResolvedValue({ enabled: false, available: false });
  render(<AuthenticatorSettings user={user} />);
  expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Set up authenticator app' })).not.toBeInTheDocument();
});
it('prevents authenticator inputs from submitting their containing profile form', async () => {
  const submit = vi.fn(); render(<form onSubmit={submit}><AuthenticatorSettings user={user} /></form>);
  const input = await screen.findByLabelText('Current password');
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  fireEvent(input, event);
  expect(event.defaultPrevented).toBe(true); expect(submit).not.toHaveBeenCalled();
});
it('keeps failed activation open for correction without publishing enabled status', async () => {
  api.updateAuthenticator.mockRejectedValue(new Error('Offline'));
  render(<AuthenticatorSettings user={user} />);
  fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'synthetic' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator app' }));
  fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }));
  await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Offline'));
  expect(screen.getByText('Authenticator app: Not enabled')).toBeInTheDocument();
});

it('keeps the recovery switch beneath its field with clearing, native keyboard access and pending guards', async () => {
  api.getAuthenticator.mockResolvedValue({ enabled: true, available: true, recovery_codes_remaining: 5 });
  const interaction = userEvent.setup();
  render(<AuthenticatorSettings user={{ ...user, role: 'admin' }} />);
  const input = await screen.findByLabelText('Authenticator code');
  const recoverySwitch = screen.getByRole('button', { name: 'Use a recovery code' });
  expect(input.closest('label').nextElementSibling).toBe(recoverySwitch);
  expect(recoverySwitch.parentElement).not.toBe(screen.getByRole('button', { name: 'Generate new recovery codes' }).parentElement);
  await interaction.type(input, '12a3456');
  expect(input).toHaveValue('123456');
  await interaction.tab();
  expect(recoverySwitch).toHaveFocus();
  await interaction.keyboard('{Enter}');
  expect(screen.getByLabelText('Recovery code')).toHaveValue('');
  expect(input).toHaveAttribute('maxlength', '35');
  expect(input).toHaveAttribute('inputmode', 'text');
  await interaction.type(input, 'SYNTHETIC');
  await interaction.click(screen.getByRole('button', { name: 'Use authenticator code' }));
  expect(screen.getByLabelText('Authenticator code')).toHaveValue('');
  expect(input).toHaveAttribute('maxlength', '6');
  expect(input).toHaveAttribute('inputmode', 'numeric');
  await interaction.click(screen.getByRole('button', { name: 'Use a recovery code' }));
  await interaction.type(input, 'SYNTHETIC');
  await interaction.type(screen.getByLabelText('Current password'), 'synthetic');
  await interaction.click(screen.getByRole('button', { name: 'Generate new recovery codes' }));
  expect(api.updateAuthenticator).not.toHaveBeenCalled();
  let fail;
  api.updateAuthenticator.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
  await interaction.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }));
  expect(recoverySwitch).toBeDisabled();
  expect(input).toBeDisabled();
  expect(api.updateAuthenticator).toHaveBeenCalledExactlyOnceWith('regenerate', { current_password: 'synthetic', recovery_code: 'SYNTHETIC' });
  await act(async () => { fail(new Error('Synthetic rejection')); });
  expect(input).toHaveValue('SYNTHETIC');
  expect(recoverySwitch).toBeEnabled();
});
