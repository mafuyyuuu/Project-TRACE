import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});

describe('Layout', () => {
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
    expect(screen.getByText('Request History')).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByText('Payment History')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Payment History'));
    await waitFor(() => expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument());
  });

  it('opens the profile card from the header avatar', async () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText('Account settings'));
    await waitFor(() => expect(screen.getByText('Account Settings')).toBeInTheDocument());
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
  });
});
