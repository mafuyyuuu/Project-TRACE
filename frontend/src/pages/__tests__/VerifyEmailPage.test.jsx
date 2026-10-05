import { vi, it, expect, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import { confirmVerification } from '@/services/emailVerificationService';
vi.mock('@/services/emailVerificationService', () => ({ confirmVerification: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); window.history.replaceState(null, '', '/verify-email#token=synthetic-token'); });
it('consumes one link once under StrictMode and removes its token from history', async () => {
  confirmVerification.mockResolvedValue({ message: 'Email verified.' });
  render(<StrictMode><MemoryRouter><VerifyEmailPage /></MemoryRouter></StrictMode>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Email verified.'));
  expect(confirmVerification).toHaveBeenCalledExactlyOnceWith('synthetic-token');
  expect(window.location.hash).toBe('');
  expect(screen.getAllByRole('link', { name: /^(Back to Login|Return to TRACE)$/ })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveClass('trace-button', 'trace-button-inverse-primary');
});
it('shows an actionable error for an expired link without automatic resubmission', async () => {
  confirmVerification.mockRejectedValue({ response: { data: { error: 'Expired. Request a new link.' } } });
  render(<MemoryRouter><VerifyEmailPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Request a new link');
  expect(confirmVerification).toHaveBeenCalledOnce();
  expect(screen.getAllByRole('link', { name: /^(Back to Login|Return to TRACE)$/ })).toHaveLength(1);
});
it('does not call the API for a missing token', async () => {
  window.history.replaceState(null, '', '/verify-email');
  render(<MemoryRouter><VerifyEmailPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('no verification token'));
  expect(confirmVerification).not.toHaveBeenCalled();
});

it.each([false, true])('navigates through one primary return action (session=%s)', async hasSession => {
  if (hasSession) localStorage.setItem('trace_token', 'synthetic-session');
  confirmVerification.mockResolvedValue({ message: 'Email verified.' });
  render(<MemoryRouter initialEntries={['/verify-email']}><Routes>
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/" element={<p>Login destination</p>} />
    <Route path="/dashboard" element={<p>Dashboard destination</p>} />
  </Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Email verified.'));
  const links = screen.getAllByRole('link', { name: /^(Back to Login|Return to TRACE)$/ });
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAccessibleName(hasSession ? 'Return to TRACE' : 'Back to Login');
  expect(links[0]).toHaveAttribute('href', hasSession ? '/dashboard' : '/');
  await userEvent.setup().click(links[0]);
  expect(screen.getByText(hasSession ? 'Dashboard destination' : 'Login destination')).toBeInTheDocument();
});

it('keeps the session-aware return action during loading and an expired-link error', async () => {
  localStorage.setItem('trace_token', 'synthetic-session');
  let reject;
  confirmVerification.mockReturnValue(new Promise((_resolve, rejectResult) => { reject = rejectResult; }));
  render(<MemoryRouter><VerifyEmailPage /></MemoryRouter>);
  expect(screen.getByRole('status')).toHaveTextContent('Verifying…');
  expect(screen.getByRole('link', { name: 'Return to TRACE' })).toHaveAttribute('href', '/dashboard');
  reject({ response: { data: { error: 'Expired. Request a new link.' } } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Expired');
  expect(screen.getAllByRole('link', { name: /^(Back to Login|Return to TRACE)$/ })).toHaveLength(1);
  expect(screen.queryByRole('link', { name: 'Back to Login' })).not.toBeInTheDocument();
});
