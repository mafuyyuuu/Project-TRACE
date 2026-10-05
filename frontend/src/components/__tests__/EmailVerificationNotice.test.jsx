import { vi, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailVerificationNotice from '@/components/EmailVerificationNotice';
import userEvent from '@testing-library/user-event';
const user = { email_verified_at: '2026-10-01', email: 'synthetic@example.test' };
it('labels only the saved verified address as Verified', () => {
  const { rerender } = render(<EmailVerificationNotice user={user} email={user.email} />);
  expect(screen.getByText('Verified')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByText('Verification help')).not.toBeInTheDocument();
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
it('shows concise student guidance and keeps supporting instructions in an expandable disclosure', async () => {
  const keyboard = userEvent.setup();
  render(<EmailVerificationNotice user={{ role: 'student', email: 'synthetic@example.test' }} email="synthetic@example.test" />);
  expect(screen.getByText('Verify your email to make requests or payments. Link expires in 1 hour; check spam.')).toBeInTheDocument();
  const summary = screen.getByText('Verification help');
  expect(summary).toHaveClass('dark:text-green-300', 'trace-button-feedback');
  const details = summary.closest('details');
  expect(details).not.toHaveAttribute('open');
  await keyboard.click(summary);
  expect(details).toHaveAttribute('open');
  expect(details).toHaveTextContent('Select Verify to resend after 60 seconds.');
  expect(details).toHaveTextContent('Refresh TRACE after verifying.');
  expect(details).toHaveTextContent('Email verification is separate from ID approval.');
  await keyboard.click(summary);
  expect(details).not.toHaveAttribute('open');
});
it('keeps staff guidance relevant without implying student request eligibility', () => {
  render(<EmailVerificationNotice user={{ role: 'clerk', email: 'staff@example.test' }} email="staff@example.test" message="Verification link sent." />);
  expect(screen.getByText('Verify your email. Link expires in 1 hour; check spam.')).toBeInTheDocument();
  expect(screen.queryByText(/to make requests or payments/)).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Verification link sent.');
});
