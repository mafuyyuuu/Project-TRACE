import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingTutorial from '@/features/student/components/OnboardingTutorial';
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
it('anchors the tour to actual controls and opens profile and support without submitting anything', async () => {
  const done = vi.fn(), prepare = vi.fn(), action = vi.fn();
  render(<><button id="tutorial-profile">Profile target</button><OnboardingTutorial onComplete={done} onPrepare={prepare} onAction={action} /></>);
  const target = document.getElementById('tutorial-profile');
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ left: 200, top: 40, right: 240, bottom: 80, width: 40, height: 40 });
  expect(screen.getByRole('dialog', { name: 'TRACE quick guide' })).toBeInTheDocument();
  await waitFor(() => expect(document.querySelector('.backdrop-blur-sm').style.clipPath).toContain('192px 32px'));
  expect(target.scrollIntoView).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Open my profile/ }));
  expect(action).toHaveBeenCalledWith('profile');
  expect(prepare).toHaveBeenLastCalledWith('email');
  expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument();
  for (const title of ['Request documents', 'Review and pay your bill', 'Track and collect', 'Watch for updates', 'Talk to Window 1']) {
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: /Open support/ }));
  expect(action).toHaveBeenLastCalledWith('dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(prepare).toHaveBeenLastCalledWith('security');
  expect(screen.getByText(/authenticator QR code/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish tour' }));
  expect(done).toHaveBeenCalledOnce();
});
it('can go back or skip and stays usable when an account has no requests or a target is missing', () => {
  const done = vi.fn();
  render(<OnboardingTutorial onComplete={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Start with your profile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Skip quick guide' }));
  expect(done).toHaveBeenCalledOnce();
});
