import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  auth.login.mockResolvedValue(undefined);
  auth.register.mockResolvedValue({ message: 'Registration received.' });
  api.post.mockResolvedValue({ data: { success: false } });
});
const renderPage = (page, path = '/') => render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);

describe('Account submission confirmations', () => {
  it('cancels sign-in without losing credentials and submits once after confirmation', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<LoginPage />);
    const id = screen.getByPlaceholderText(/23-00123/);
    const password = container.querySelector('input[type=password]');
    await user.type(id, 'STU-001');
    await user.type(password, 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    expect(auth.login).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(id).toHaveValue('STU-001');
    expect(password).toHaveValue('password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledExactlyOnceWith({ employeeId: 'STU-001', password: 'password123' }));
  });

  it('does not open a sign-in confirmation with missing credentials', async () => {
    const user = userEvent.setup();
    renderPage(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
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
    expect(picker.files[0]).toBe(proof);
    expect(inputs[0]).toHaveValue('STU-001');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await user.click(screen.getByRole('button', { name: 'Submit Registration' }));
    await waitFor(() => expect(auth.register).toHaveBeenCalledOnce());
    const payload = auth.register.mock.calls[0][0];
    expect(payload.get('employee_id')).toBe('STU-001');
    expect(payload.get('course')).toBe('Engineering');
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
