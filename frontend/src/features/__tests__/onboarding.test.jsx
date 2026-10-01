import { vi, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingTutorial from '@/features/student/components/OnboardingTutorial';
it('explains profile gates, billing, tracking and support without requiring a visible target', () => {
  const done = vi.fn();
  render(<OnboardingTutorial onComplete={done} />);
  expect(screen.getByRole('dialog', { name: 'TRACE quick guide' })).toBeInTheDocument();
  expect(screen.getByText(/New Request explains each missing field/)).toBeInTheDocument();
  for (const title of ['Verify your email', 'Request documents', 'Review and pay your bill', 'Track and collect', 'Messages, attachments and notifications', 'Protect your account']) {
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  }
  expect(screen.getByText(/Authenticator setup uses a QR code/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(done).toHaveBeenCalledOnce();
});
