import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/services/authService', () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

import { forgotPassword, resetPassword } from '@/services/authService';
import usePasswordReset from '@/hooks/usePasswordReset';

beforeEach(() => {
  forgotPassword.mockReset();
  resetPassword.mockReset();
});

describe('requestLink', () => {
  it('validates the identifier before calling the API', async () => {
    const { result } = renderHook(() => usePasswordReset());
    await act(async () => result.current.requestLink('   '));

    expect(forgotPassword).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/Student ID/i));
  });

  it("shows the backend's message verbatim rather than claiming delivery", async () => {
    // The backend answers identically for accounts that do and don't exist.
    // Substituting a cheerier "Sent!" here would leak what that hides.
    forgotPassword.mockResolvedValue({ message: 'If that account exists, a link has been sent.' });
    const { result } = renderHook(() => usePasswordReset());

    await act(async () => result.current.requestLink('STU2024001'));

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.message).toBe('If that account exists, a link has been sent.');
  });

  it('trims the identifier before sending it', async () => {
    forgotPassword.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => usePasswordReset());

    await act(async () => result.current.requestLink('  STU2024001  '));
    expect(forgotPassword).toHaveBeenCalledWith('STU2024001');
  });

  it('surfaces a server error inline', async () => {
    forgotPassword.mockRejectedValue({ response: { data: { error: 'Too many requests.' } } });
    const { result } = renderHook(() => usePasswordReset());

    await act(async () => result.current.requestLink('STU2024001'));
    await waitFor(() => expect(result.current.error).toBe('Too many requests.'));
    expect(result.current.done).toBe(false);
  });
});

describe('submitNewPassword', () => {
  it('refuses a missing token without calling the API', async () => {
    const { result } = renderHook(() => usePasswordReset());
    await act(async () => result.current.submitNewPassword('', 'newpassword1', 'newpassword1'));

    expect(resetPassword).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/missing its token/i));
  });

  it('enforces the minimum length before hitting the network', async () => {
    const { result } = renderHook(() => usePasswordReset());
    await act(async () => result.current.submitNewPassword('tok', 'short', 'short'));

    expect(resetPassword).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/at least 8/i));
  });

  it('requires the two passwords to match', async () => {
    const { result } = renderHook(() => usePasswordReset());
    await act(async () => result.current.submitNewPassword('tok', 'newpassword1', 'newpassword2'));

    expect(resetPassword).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/do not match/i));
  });

  it('submits the token and password together on success', async () => {
    resetPassword.mockResolvedValue({ message: 'Password updated.' });
    const { result } = renderHook(() => usePasswordReset());

    await act(async () => result.current.submitNewPassword('tok', 'newpassword1', 'newpassword1'));

    expect(resetPassword).toHaveBeenCalledWith({ token: 'tok', password: 'newpassword1' });
    await waitFor(() => expect(result.current.done).toBe(true));
  });
});
