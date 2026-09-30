import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import api from '@/services/api';

const { auth, reset } = vi.hoisted(() => ({
  auth: { login: vi.fn(), register: vi.fn(), loading: false, error: '' },
  reset: { requestLink: vi.fn(), submitNewPassword: vi.fn(), loading: false, error: '', done: false },
}));
vi.mock('@/hooks/useAuth', () => ({ default: () => auth }));
vi.mock('@/hooks/usePasswordReset', () => ({ default: () => reset }));
vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn().mockResolvedValue({ colleges: [{ id: 1, name: 'Engineering' }] }) }));
vi.mock('@/services/api', () => ({ default: { post: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.loading = false;
  auth.error = '';
  auth.login.mockResolvedValue(undefined);
  auth.register.mockResolvedValue({ message: 'Registration received.' });
  api.post.mockResolvedValue({ data: { success: false } });
});
afterEach(() => vi.useRealTimers());
const renderPage = (page, path = '/') => render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);

describe('Account submission confirmations', () => {
  it('fills new alumni identity from OCR only on request, preserving manually entered names', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<SignupPage />);
    await screen.findByRole('option', { name: 'Engineering' });
    fireEvent.change(container.querySelector('select'), { target: { value: 'alumni' } });
    const name = screen.getByPlaceholderText('Juan Dela Cruz');
    await user.type(name, 'Manual Name');
    await user.upload(container.querySelector('input[type=file]'), new File(['proof'], 'id.png', { type: 'image/png' }));
    expect(api.post).not.toHaveBeenCalled();
    api.post.mockResolvedValueOnce({ data: { success: true, alumni_id: 'ALU1234567', student_id: 'STU1234567', full_name: 'OCR Name', college_id: 1 } });
    await user.click(screen.getByRole('button', { name: 'Read ID' }));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter your Alumni ID')).toHaveValue('ALU1234567'));
    expect(name).toHaveValue('Manual Name');
    expect(container.querySelectorAll('select')[1]).toHaveValue('Engineering');
    expect(auth.register).not.toHaveBeenCalled();
    fireEvent.change(container.querySelector('select'), { target: { value: 'student' } });
    expect(screen.getByPlaceholderText('e.g. 23-00123')).toHaveValue('');
  });
  it('submits sign-in directly without a confirmation dialog', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<LoginPage />);
    const id = screen.getByPlaceholderText(/23-00123/);
    const password = container.querySelector('input[type=password]');
    await user.type(id, 'STU-001');
    await user.type(password, 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(auth.login).toHaveBeenCalledExactlyOnceWith({ employeeId: 'STU-001', password: 'password123', sharedComputer: true }));
  });

  it('shows missing credentials inline without sending a login request', async () => {
    const user = userEvent.setup();
    renderPage(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter both ID and password.');
  });

  it('supports Enter to sign in and retains credentials after an inline error', async () => {
    const user = userEvent.setup();
    auth.login.mockRejectedValueOnce({ response: { data: { error: 'Invalid credentials.' } } });
    const { container } = renderPage(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/23-00123/), 'ADMIN001');
    await user.type(container.querySelector('input[type=password]'), 'password123{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.');
    expect(auth.login).toHaveBeenCalledOnce();
    expect(screen.getByPlaceholderText(/23-00123/)).toHaveValue('ADMIN001');
    expect(container.querySelector('input[type=password]')).toHaveValue('password123');
    expect(screen.getByRole('button', { name: 'LOGIN' })).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('announces pending login and rejects duplicate submissions before rerender', async () => {
    let finishLogin;
    auth.login.mockReturnValueOnce(new Promise(resolve => { finishLogin = resolve; }));
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'ADMIN001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'password123' } });
    const form = container.querySelector('form');
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(auth.login).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('PROCESSING...');
    expect(screen.getByRole('button', { name: /PROCESSING/ })).toBeDisabled();
    expect(form).toHaveAttribute('aria-busy', 'true');
    await act(async () => { finishLogin(undefined); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LOGIN' })).toBeEnabled();
  });

  it('keeps required OTP, submits it directly, and allows retry after verification failure', async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'challenge-token', email: 'staff@example.test' });
    const { container } = renderPage(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/23-00123/), 'ADMIN001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    const otp = await screen.findByPlaceholderText('Enter 6-digit OTP');
    await user.click(screen.getByRole('button', { name: 'VERIFY & LOGIN' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter the OTP.');
    expect(api.post).not.toHaveBeenCalled();
    let failVerification;
    api.post.mockReturnValueOnce(new Promise((resolve, reject) => { failVerification = reject; }));
    await user.type(otp, '123456');
    act(() => { fireEvent.submit(container.querySelector('form')); fireEvent.submit(container.querySelector('form')); });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', { temp_token: 'challenge-token', otp: '123456' });
    expect(screen.getByRole('status')).toHaveTextContent('PROCESSING...');
    expect(screen.getByRole('button', { name: 'Back to Login' })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => { failVerification({ response: { data: { error: 'Invalid OTP.' } } }); });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid OTP.');
    expect(otp).toHaveValue('123456');
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Code expired.' } } });
    await user.click(screen.getByRole('button', { name: 'VERIFY & LOGIN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code expired.');
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'VERIFY & LOGIN' })).toBeEnabled();
  });

  it('resends after the cooldown, prevents duplicate sends, and verifies with the fresh challenge', async () => {
    vi.useFakeTimers();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'old-challenge', email: 'staff@example.test' });
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'ADMIN001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    expect(screen.getByRole('button', { name: 'Resend OTP (60s)' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit OTP'), { target: { value: '123456' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    const resend = screen.getByRole('button', { name: 'Resend OTP' });
    expect(resend).toBeEnabled();
    let finishResend;
    auth.login.mockReturnValueOnce(new Promise(resolve => { finishResend = resolve; }));
    act(() => { fireEvent.click(resend); fireEvent.click(resend); });
    expect(auth.login).toHaveBeenCalledTimes(2);
    expect(auth.login).toHaveBeenLastCalledWith({ employeeId: 'ADMIN001', password: 'password123', sharedComputer: true });
    expect(screen.getByRole('button', { name: 'Sending code…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /PROCESSING/ })).toBeDisabled();
    await act(async () => { finishResend({ requires_2fa: true, temp_token: 'new-challenge', email: 'staff@example.test' }); });
    expect(screen.getByPlaceholderText('Enter 6-digit OTP')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Use the latest code');
    expect(screen.getByRole('button', { name: 'Resend OTP (60s)' })).toBeDisabled();
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid OTP.' } } });
    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit OTP'), { target: { value: '654321' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', { temp_token: 'new-challenge', otp: '654321' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a failed resend inline without replacing the challenge or claiming success', async () => {
    vi.useFakeTimers();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'existing-challenge', email: 'staff@example.test' });
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'ADMIN001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit OTP'), { target: { value: '123456' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    auth.login.mockImplementationOnce(async () => { auth.error = 'Unable to send email.'; return undefined; });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resend OTP' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to send email.');
    expect(screen.queryByText(/A new code has been requested/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit OTP')).toHaveValue('123456');
    expect(screen.getByRole('button', { name: 'VERIFY & LOGIN' })).toBeEnabled();
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Code expired.' } } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', { temp_token: 'existing-challenge', otp: '123456' });
  });

  it('defaults to shared mode with no browser-trust option for an Admin challenge', async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'challenge', can_trust_browser: false });
    const { container } = renderPage(<LoginPage />);
    expect(screen.getByRole('checkbox', { name: 'This is a shared computer' })).toBeChecked();
    await user.type(screen.getByPlaceholderText(/23-00123/), 'ADMIN001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    await screen.findByPlaceholderText('Enter 6-digit OTP');
    expect(screen.queryByRole('checkbox', { name: 'Trust this browser for today' })).not.toBeInTheDocument();
    expect(auth.login).toHaveBeenCalledWith({ employeeId: 'ADMIN001', password: 'password123', sharedComputer: true });
  });

  it.each([false, true])('sends clerk trust only after personal mode and explicit opt-in (%s)', async optIn => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'personal-challenge', can_trust_browser: true });
    const { container } = renderPage(<LoginPage />);
    await user.click(screen.getByRole('checkbox', { name: 'This is a shared computer' }));
    await user.type(screen.getByPlaceholderText(/23-00123/), 'CLERK001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    const choice = await screen.findByRole('checkbox', { name: 'Trust this browser for today' });
    expect(choice).not.toBeChecked();
    expect(screen.getByText(/until midnight Manila time/)).toBeInTheDocument();
    expect(auth.login).toHaveBeenCalledWith({ employeeId: 'CLERK001', password: 'password123', sharedComputer: false });
    if (optIn) await user.click(choice);
    await user.type(screen.getByPlaceholderText('Enter 6-digit OTP'), '123456');
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Synthetic rejection' } } });
    await user.click(screen.getByRole('button', { name: 'VERIFY & LOGIN' }));
    expect(api.post).toHaveBeenCalledWith('/auth/verify-2fa', { temp_token: 'personal-challenge', otp: '123456', ...(optIn ? { trust_browser: true } : {}) });
  });

  it('resets consent on a fresh OTP and preserves personal mode when resending', async () => {
    vi.useFakeTimers();
    auth.login.mockResolvedValue({ requires_2fa: true, temp_token: 'personal-challenge', can_trust_browser: true });
    const { container } = renderPage(<LoginPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'This is a shared computer' }));
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'CLERK001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trust this browser for today' }));
    expect(screen.getByRole('checkbox', { name: 'Trust this browser for today' })).toBeChecked();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resend OTP' })); });
    expect(auth.login).toHaveBeenLastCalledWith({ employeeId: 'CLERK001', password: 'password123', sharedComputer: false });
    expect(screen.getByRole('checkbox', { name: 'Trust this browser for today' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Resend OTP (60s)' })).toBeDisabled();
  });

  it('preserves the registration proof and fields when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<SignupPage />);
    await screen.findByRole('option', { name: 'Engineering' });
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'Engineering' } });
    const inputs = container.querySelectorAll('input');
    const values = ['STU-001', 'Ana Reyes', 'ana@example.test', '09171234567', 'password123', 'password123'];
    values.forEach((value, index) => fireEvent.change(inputs[index], { target: { value } }));
    const proof = new File(['proof'], 'id.png', { type: 'image/png' });
    const picker = container.querySelector('input[type=file]');
    await user.upload(picker, proof);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(auth.register).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.getByText(/Selected: id.png/)).toBeInTheDocument();
    expect(inputs[0]).toHaveValue('STU-001');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await user.click(screen.getByRole('button', { name: 'Submit Registration' }));
    await waitFor(() => expect(auth.register).toHaveBeenCalledOnce());
    const payload = auth.register.mock.calls[0][0];
    expect(payload.get('employee_id')).toBe('STU-001');
    expect(payload.get('course')).toBe('Engineering');
    expect(payload.get('college_id')).toBe('1');
    expect(payload.get('id_proof').name).toBe('id.png');
  });

  it('requires confirmation before requesting a reset link', async () => {
    const user = userEvent.setup();
    renderPage(<ForgotPasswordPage />);
    const identifier = screen.getByLabelText('Student ID / Staff ID or Email');
    await user.type(identifier, 'ana@example.test');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(reset.requestLink).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(identifier).toHaveValue('ana@example.test');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    await user.click(screen.getByRole('button', { name: 'Request Link' }));
    expect(reset.requestLink).toHaveBeenCalledExactlyOnceWith('ana@example.test');
  });

  it('checks password matching before confirmation and keeps the token and new password payload', async () => {
    const user = userEvent.setup();
    renderPage(<ResetPasswordPage />, '/reset-password?token=test-token');
    const password = screen.getByLabelText('New Password');
    const repeat = screen.getByLabelText('Confirm New Password');
    await user.type(password, 'password123');
    await user.type(repeat, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reset.submitNewPassword).not.toHaveBeenCalled();
    await user.clear(repeat);
    await user.type(repeat, 'password123');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Password Reset' })).getByRole('button', { name: 'Cancel' }));
    expect(password).toHaveValue('password123');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(reset.submitNewPassword).toHaveBeenCalledExactlyOnceWith('test-token', 'password123', 'password123');
  });
});
