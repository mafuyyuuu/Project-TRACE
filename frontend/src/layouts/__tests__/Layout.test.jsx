import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({
  default: () => ({ user: currentUser, logout: logoutSpy }),
}));

vi.mock('@/services/authService', () => ({
  getNotifications: vi.fn(async () => ({ notifications: [] })),
  markNotificationsRead: vi.fn(async () => ({})),
  updateProfile: vi.fn(async () => ({})),
  uploadProfilePicture: vi.fn(async () => ({})),
}));

vi.mock('@/services/realtimeService', () => ({
  onNotification: vi.fn(() => () => {}),
  disconnectRealtime: vi.fn(),
}));
vi.mock('@/services/onboardingService', () => ({ startFirstLoginGuide: vi.fn(async () => false) }));

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(() => new Promise(() => {})) },
}));

const STUDENT = {
  id: 3,
  student_id: 'STU2024001',
  full_name: 'Ana Reyes',
  role: 'student',
  email: 'ana@plp.edu.ph',
  phone_number: '+639171234567',
};

const logoutSpy = vi.fn();
let currentUser = STUDENT;
vi.mock('@/features/graduate/GraduateApplication', () => ({ default: () => <section aria-label="Graduate application">Graduate application form</section> }));

import Layout from '@/layouts/Layout';
import { startFirstLoginGuide } from '@/services/onboardingService';
import { TEXT_SIZE_KEY, applyTextSize } from '@/utils/textSize';

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Layout />
    </MemoryRouter>
  );

beforeEach(() => {
  currentUser = STUDENT;
  vi.clearAllMocks();
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('trace_theme');
  localStorage.removeItem(TEXT_SIZE_KEY);
  applyTextSize(100);
  startFirstLoginGuide.mockResolvedValue(false);
});

describe('Layout', () => {
  it('automatically offers a new account the tour and uses the question mark for replay', async () => {
    startFirstLoginGuide.mockResolvedValue(true);
    renderLayout();
    expect(await screen.findByRole('dialog', { name: 'TRACE quick guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open quick guide' }).querySelector('svg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open my profile/ }));
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip quick guide' }));
    expect(screen.queryByRole('dialog', { name: 'TRACE quick guide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open quick guide' }));
    expect(screen.getByRole('heading', { name: 'Start with your profile' })).toBeInTheDocument();
    expect(startFirstLoginGuide).toHaveBeenCalledOnce();
  });
  it('does not offer the student tour to staff', () => {
    currentUser = { ...STUDENT, role: 'clerk', desk_assignment: 'Finance' };
    renderLayout();
    expect(screen.queryByRole('button', { name: 'Open quick guide' })).not.toBeInTheDocument();
    expect(startFirstLoginGuide).not.toHaveBeenCalled();
  });
  it('places email verification in Edit Profile instead of the dashboard banner', () => {
    currentUser = { ...STUDENT, email_verified_at: null };
    renderLayout();
    expect(screen.queryByRole('region', { name: 'Verify email' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toHaveValue(STUDENT.email);
  });
  it('routes new alumni to the graduation form with no shared navigation or profile bypass', () => {
    currentUser = { ...STUDENT, user_type: 'alumni', has_grad_application: false, email_verified_at: null };
    renderLayout();
    expect(screen.getByRole('region', { name: 'Graduate application' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preferences' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Profile' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    expect(screen.getByRole('dialog', { name: 'Log Out' })).toBeInTheDocument();
  });
  it('applies text size through Preferences, preserves the account and restores it on reopening', () => {
    localStorage.setItem('trace_token', 'existing-token');
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }));
    const size = screen.getByRole('combobox', { name: 'Text size' });
    fireEvent.change(size, { target: { value: '200' } });
    expect(document.documentElement.style.fontSize).toBe('200%');
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('200');
    expect(localStorage.getItem('trace_token')).toBe('existing-token');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }));
    expect(screen.getByRole('combobox', { name: 'Text size' })).toHaveValue('200');
  });
  it('applies and saves the theme without resetting account data', () => {
    localStorage.setItem('trace_token', 'existing-token');
    renderLayout();
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('trace_theme')).toBe('dark');
    expect(localStorage.getItem('trace_token')).toBe('existing-token');
    fireEvent.click(toggle);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('trace_theme')).toBe('light');
  });

  it('keeps theme switching usable when storage is blocked', () => {
    renderLayout();
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    spy.mockRestore();
  });

  it('contains drawer focus and restores it when Escape closes navigation', () => {
    renderLayout();
    const trigger = screen.getByLabelText('Open navigation menu');
    trigger.focus();
    fireEvent.click(trigger);
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    const controls = drawer.querySelectorAll('button, a[href]');
    expect(controls[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(controls[controls.length - 1]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(controls[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('yields drawer keyboard handling to logout confirmation and restores drawer focus', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByLabelText('Open navigation menu'));
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    const logout = within(drawer).getByRole('button', { name: 'Logout' });
    await user.click(logout);
    const confirm = screen.getByRole('dialog', { name: 'Log Out' });
    expect(within(confirm).getByRole('button', { name: 'Stay Signed In' })).toHaveFocus();
    await user.tab();
    expect(within(confirm).getByRole('button', { name: 'Log Out' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(confirm).getByRole('button', { name: 'Stay Signed In' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Log Out' })).not.toBeInTheDocument();
    expect(drawer).toBeInTheDocument();
    expect(logout).toHaveFocus();
    expect(logoutSpy).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open navigation menu')).toHaveFocus();
  });
  it('renders the shell', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('TRACE').length).toBeGreaterThan(0));
  });

  // Below md the sidebar rail is hidden, so the hamburger is the only way
  // to reach any tab other than the dashboard.
  it('keeps the mobile drawer closed until the hamburger is used', async () => {
    renderLayout();
    expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open navigation menu'));

    await waitFor(() => expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument());
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('closes the drawer from its own close control', async () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    await waitFor(() => expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Close navigation menu'));
    await waitFor(() => expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument());
  });

  it('closes the drawer once a destination is chosen', async () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    await waitFor(() => expect(screen.getByText('Help / FAQ')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Help / FAQ'));
    await waitFor(() => expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument());
  });

  it('opens the profile card from the header avatar', async () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText('Edit Profile'));
    await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
  });
});

it('opens Edit Profile directly from the incomplete-request action', () => {
  renderLayout();
  act(() => window.dispatchEvent(new CustomEvent('open-profile-settings')));
  expect(screen.getByRole('dialog', { name: 'Edit Profile' })).toBeInTheDocument();
  expect(screen.getByText(/Still needed:/)).toHaveTextContent('Birth Date');
  expect(screen.getByText('Personal Info')).toBeInTheDocument();
});
