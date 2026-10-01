import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import * as api from '@/services/authenticatorService';
vi.mock('@/services/authenticatorService', () => ({ getAuthenticator: vi.fn(), beginAuthenticator: vi.fn(), updateAuthenticator: vi.fn() }));
vi.mock('@/services/realtimeService', () => ({ disconnectRealtime: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,synthetic') } }));
const user = { id: 3, role: 'student' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  api.getAuthenticator.mockResolvedValue({ enabled: false, available: true });
  api.beginAuthenticator.mockResolvedValue({ secret: 'MANUAL-SETUP', provisioning_uri: 'otpauth://totp/TRACE:test' });
  api.updateAuthenticator.mockResolvedValue({ token: 'synthetic', user, enabled: true, recovery_codes: ['SINGLE-USE-CODE'] });
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
