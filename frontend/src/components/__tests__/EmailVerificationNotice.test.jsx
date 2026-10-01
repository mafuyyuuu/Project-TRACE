import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EmailVerificationNotice from '@/components/EmailVerificationNotice';
import { resendVerification } from '@/services/emailVerificationService';
vi.mock('@/services/emailVerificationService', () => ({ resendVerification: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it('stays absent after verified proof is saved', () => {
  render(<EmailVerificationNotice user={{ email_verified_at: '2026-10-01', email: 'synthetic@example.test' }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('guards duplicate sends and reports real delivery failure', async () => {
  let resolve;
  resendVerification.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<EmailVerificationNotice user={{ email_verified_at: null, email: 'synthetic@example.test' }} />);
  const send = screen.getByRole('button', { name: /Resend Link/ });
  fireEvent.click(send); fireEvent.click(send);
  expect(resendVerification).toHaveBeenCalledOnce();
  expect(send).toBeDisabled();
  await act(async () => resolve({ email_sent: false, message: 'Delivery failed. Retry in 60 seconds.' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Retry in 60 seconds');
  expect(send).not.toBeDisabled();
});
