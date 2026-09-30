import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({
  default: () => ({ user: STUDENT, logout: logoutSpy }),
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

import Layout from '@/layouts/Layout';

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Layout />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('trace_theme');
});

describe('Layout', () => {
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
