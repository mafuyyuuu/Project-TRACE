import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardLoading from '@/components/DashboardLoading';
import App from '@/App';
import api, { getPendingApiRequests } from '@/services/api';

vi.mock('@/hooks/useAuth', () => ({ default: () => ({ login: vi.fn(), loading: false, error: '' }) }));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  expect(getPendingApiRequests()).toBe(0);
});

describe('DashboardLoading', () => {
  it('retains the dashboard loader and supports a compact, reduced-motion status', () => {
    const { rerender } = render(<DashboardLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Synchronizing Command Center...');
    rerender(<DashboardLoading compact label="Loading…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading…');
    expect(status.querySelector('[aria-hidden=true]')).toHaveClass('motion-reduce:animate-none');
  });

  it('shows API activity across navigation and clears it on completion without disabling the page', async () => {
    const user = userEvent.setup();
    let finish;
    const adapter = config => new Promise(resolve => {
      finish = () => resolve({ config, data: {}, status: 200, statusText: 'OK', headers: {} });
    });
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    let request;
    await act(async () => { request = api.get('/activity-fixture', { adapter }); });
    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('button', { name: 'LOGIN' })).toBeEnabled();
    await user.click(screen.getByRole('link', { name: 'Forgot Password?' }));
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    await act(async () => { finish(); await request; });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(getPendingApiRequests()).toBe(0);
  });
});
