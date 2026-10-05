import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import { getOnboardingSteps } from '@/utils/onboardingSteps';
import { navItemsForUser } from '@/utils/navigation';
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
it.each(['Window 1', 'Secretary', 'Finance', 'Admin'])('guides %s through only its authorized destinations', desk => {
  const user = { role: desk === 'Admin' ? 'admin' : 'clerk', desk_assignment: desk };
  const allowedTabs = navItemsForUser(user).map(item => item.tab);
  const steps = getOnboardingSteps(user);
  for (const step of steps.filter(item => item.area.startsWith('navigation:'))) {
    expect(allowedTabs).toContain(step.area.slice(11));
  }
  const done = vi.fn(), prepare = vi.fn();
  render(<OnboardingTutorial user={user} onComplete={done} onPrepare={prepare} />);
  for (const step of steps) {
    expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument();
    expect(prepare).toHaveBeenLastCalledWith(step.area);
    fireEvent.click(screen.getByRole('button', { name: step === steps.at(-1) ? 'Finish tour' : 'Next' }));
  }
  expect(done).toHaveBeenCalledOnce();
});
it('spotlights the visible mobile link instead of the hidden duplicate desktop link', async () => {
  const prepare = vi.fn(), action = vi.fn();
  render(<><a data-guide-tab="reports" href="#desktop">Desktop report</a><a data-guide-tab="reports" href="#mobile">Mobile report</a>
    <OnboardingTutorial user={{ role: 'clerk', desk_assignment: 'Finance' }} onComplete={vi.fn()} onPrepare={prepare} onAction={action} /></>);
  vi.spyOn(screen.getByText('Desktop report'), 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0 });
  const mobile = screen.getByText('Mobile report');
  vi.spyOn(mobile, 'getBoundingClientRect').mockReturnValue({ left: 40, top: 120, right: 240, bottom: 160, width: 200, height: 40 });
  for (let step = 0; step < 3; step += 1) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(document.querySelector('.backdrop-blur-sm').style.clipPath).toContain('32px 112px'));
  expect(mobile.scrollIntoView).toHaveBeenCalled();
  expect(prepare).toHaveBeenLastCalledWith('navigation:reports');
  fireEvent.click(screen.getByRole('button', { name: 'Open Transactions & Export' }));
  expect(action).toHaveBeenCalledWith('navigation:reports');
});
