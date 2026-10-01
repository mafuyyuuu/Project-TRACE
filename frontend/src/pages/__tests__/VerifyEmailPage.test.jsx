import { vi, it, expect, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import { confirmVerification } from '@/services/emailVerificationService';
vi.mock('@/services/emailVerificationService', () => ({ confirmVerification: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, '', '/verify-email#token=synthetic-token'); });
it('consumes one link once under StrictMode and removes its token from history', async () => {
  confirmVerification.mockResolvedValue({ message: 'Email verified.' });
  render(<StrictMode><MemoryRouter><VerifyEmailPage /></MemoryRouter></StrictMode>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Email verified.'));
  expect(confirmVerification).toHaveBeenCalledExactlyOnceWith('synthetic-token');
  expect(window.location.hash).toBe('');
  expect(screen.getByRole('link', { name: 'Back to Login' })).toBeInTheDocument();
});
it('shows an actionable error for an expired link without automatic resubmission', async () => {
  confirmVerification.mockRejectedValue({ response: { data: { error: 'Expired. Request a new link.' } } });
  render(<MemoryRouter><VerifyEmailPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Request a new link');
  expect(confirmVerification).toHaveBeenCalledOnce();
});
it('does not call the API for a missing token', async () => {
  window.history.replaceState(null, '', '/verify-email');
  render(<MemoryRouter><VerifyEmailPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('no verification token'));
  expect(confirmVerification).not.toHaveBeenCalled();
});
