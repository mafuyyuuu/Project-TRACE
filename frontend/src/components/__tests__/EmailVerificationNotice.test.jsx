import { vi, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailVerificationNotice from '@/components/EmailVerificationNotice';
const user = { email_verified_at: '2026-10-01', email: 'synthetic@example.test' };
it('labels only the saved verified address as Verified', () => {
  const { rerender } = render(<EmailVerificationNotice user={user} email={user.email} />);
  expect(screen.getByText('Verified')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<EmailVerificationNotice user={user} email="new@example.test" />);
  expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled();
});
it('keeps the action beside its field and exposes delivery failure and pending state', () => {
  const verify = vi.fn();
  const { rerender } = render(<EmailVerificationNotice user={user} email="new@example.test" onVerify={verify}><input aria-label="Email" /></EmailVerificationNotice>);
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(verify).toHaveBeenCalledOnce();
  rerender(<EmailVerificationNotice user={user} email="new@example.test" sending pendingEmail="new@example.test" error="Delivery failed. Retry in 60 seconds." />);
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Retry in 60 seconds');
  expect(screen.getByText(/Your current address stays active/)).toBeInTheDocument();
});
