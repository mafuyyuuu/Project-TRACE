import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import api from '@/services/api';
vi.mock('@/services/registrationService',()=>({checkRegistrationId:vi.fn().mockResolvedValue({available:true})}));
import plpLoginLogo from '@/assets/plp-login-logo.png';

const { auth, reset } = vi.hoisted(() => ({
  auth: { login: vi.fn(), register: vi.fn(), loading: false, error: '' },
  reset: { requestLink: vi.fn(), submitNewPassword: vi.fn(), loading: false, error: '', done: false },
}));
vi.mock('@/hooks/useAuth', () => ({ default: () => auth }));
vi.mock('@/hooks/usePasswordReset', () => ({ default: () => reset }));
vi.mock('@/services/referenceService', () => ({
  getColleges: vi.fn().mockResolvedValue({ colleges: [{ id: 1, name: 'Engineering' }] }),
  getPrograms: vi.fn().mockResolvedValue({ programs: [{ id: 1, college_id: 1, name: 'BS Engineering' }] }),
}));
vi.mock('@/services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  auth.loading = false;
  auth.error = '';
  auth.login.mockResolvedValue(undefined);
  auth.register.mockResolvedValue({ message: 'Registration received.' });
  api.post.mockResolvedValue({ data: { success: false } });
  api.get.mockResolvedValue({ data: { proof_unavailable_enabled: false } });
});
afterEach(() => vi.useRealTimers());
const renderPage = (page, path = '/') => render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);

async function signupAcademic(type = 'student') {
  await screen.findByRole('option',{name:'Engineering'});
  if(type === 'alumni') await userEvent.click(screen.getByRole('button',{name:'Alumni',exact:true}));
  else fireEvent.change(screen.getByLabelText('Type of Student *'),{target:{value:'regular'}});
  fireEvent.change(screen.getByLabelText('College *'),{target:{value:'Engineering'}});
  fireEvent.change(screen.getByLabelText('Program/Course *'),{target:{value:'BS Engineering'}});
  fireEvent.change(screen.getByLabelText(type === 'student' ? 'Student ID *' : 'Alumni ID *'),{target:{value:type === 'student' ? 'STU-001' : 'ALU-DEMO'}});
  if(type === 'alumni') {
    fireEvent.change(screen.getByLabelText('Year Started *'),{target:{value:'2010'}});
    fireEvent.change(screen.getByLabelText('Year Graduated *'),{target:{value:'2014'}});
  }
  await userEvent.click(screen.getByRole('button',{name:'Continue'}));
}
async function signupPersonal(first = 'Ana', last = 'Reyes') {
 for(const[label,value]of [['First Name *',first],['Last Name *',last],['Email Address *','ana@example.test'],['Phone Number *','09171234567']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 await userEvent.click(screen.getByRole('button',{name:'Continue'}));
 for(const placeholder of ['Create a password','Confirm your password'])fireEvent.change(screen.getByPlaceholderText(placeholder),{target:{value:'Password123_'}});
}

describe('Account submission confirmations', () => {
  it('offers Admin personal-browser trust unchecked on the authenticator challenge and saves only a confirmed grant', async () => {
    auth.login.mockResolvedValueOnce({ requires_2fa: true, mfa_method: 'authenticator', temp_token: 'admin-app', can_trust_browser: true });
    const { container } = renderPage(<LoginPage />);
    expect(screen.getByRole('img', { name: 'Pamantasan ng Lungsod ng Pasig logo' })).toHaveAttribute('src', plpLoginLogo);
    expect(screen.queryByRole('img', { name: 'TRACE logo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'ADMIN001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'test-password' } });
    fireEvent.submit(container.querySelector('form'));
    const choice = await screen.findByRole('checkbox');
    expect(screen.getByRole('img', { name: 'Pamantasan ng Lungsod ng Pasig logo' })).toHaveAttribute('src', plpLoginLogo);
    expect(choice).not.toBeChecked();
    fireEvent.click(choice);
    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit OTP'), { target: { value: '123456' } });
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid verification code.' } } });
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid verification code.');
    expect(localStorage.getItem('trace_browser_trust_until')).toBeNull();
    const until = new Date(Date.now() + 60000).toISOString();
    api.post.mockResolvedValueOnce({ data: { token: 'synthetic-session', user: { role: 'admin' }, browser_trusted_until: until } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(localStorage.getItem('trace_browser_trust_until')).toBe(String(Date.parse(until))));
    expect(api.post).toHaveBeenLastCalledWith('/auth/verify-2fa', { temp_token: 'admin-app', otp: '123456', trust_browser: true });
  });
  it('offers staff setup only after the server identifies a clerk needing enrollment', async () => {
    auth.login.mockResolvedValueOnce({ requires_authenticator_setup: true });
    const { container } = renderPage(<LoginPage />);
    expect(screen.queryByText(/open staff authenticator setup/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'FINANCE001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'staff-password' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByRole('link', { name: 'open staff authenticator setup' })).toHaveAttribute('href', '/staff-setup');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('trace_token')).toBeNull();
  });
  it('uses an unexpired server-granted preference on a later password login without a public checkbox', async () => {
    localStorage.setItem('trace_clerk_browser_until', String(Date.now() + 60000));
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'FINANCE001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'staff-password' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ employeeId: 'FINANCE001', password: 'staff-password', sharedComputer: false }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('keeps manually entered alumni identity and proof upload without an OCR request', async () => {
    const user=userEvent.setup();renderPage(<SignupPage/>);await signupAcademic('alumni');
    await signupPersonal('Manual','Name');
    await user.upload(screen.getByLabelText('Proof of ID',{selector:'input'}),new File(['proof'],'id.png',{type:'image/png'}));
    expect(screen.getByText('Upload Proof of ID')).toBeInTheDocument();expect(api.post).not.toHaveBeenCalled();expect(auth.register).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:'Back'}));expect(screen.getByLabelText('Full Name')).toHaveValue('Manual Name');
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

  it('uses app recovery codes without offering an email downgrade', async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, mfa_method: 'authenticator', temp_token: 'app-challenge' });
    const { container } = renderPage(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/23-00123/), 'STU-001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    expect(await screen.findByText(/six-digit code from your authenticator app/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resend OTP/ })).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Verification code' });
    const recoverySwitch = screen.getByRole('button', { name: 'Use a recovery code' });
    expect(input.nextElementSibling).toBe(recoverySwitch);
    await user.type(input, '123456');
    await user.tab();
    expect(recoverySwitch).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'Recovery code' })).toHaveValue('');
    expect(input).toHaveAttribute('maxlength', '35');
    expect(input).toHaveAttribute('inputmode', 'text');
    await user.type(input, 'SYNTHETIC');
    await user.click(screen.getByRole('button', { name: 'Use authenticator code' }));
    expect(screen.getByRole('textbox', { name: 'Verification code' })).toHaveValue('');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    await user.click(screen.getByRole('button', { name: 'Use a recovery code' }));
    const code = '01234567-89ABCDEF-01234567-89ABCDEF';
    await user.type(screen.getByPlaceholderText('Enter recovery code'), code);
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Code already used.' } } });
    await user.click(screen.getByRole('button', { name: 'VERIFY & LOGIN' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', { temp_token: 'app-challenge', recovery_code: code });
    expect(await screen.findByRole('alert')).toHaveTextContent('Code already used.');
    expect(screen.getByPlaceholderText('Enter recovery code')).toHaveValue(code);
  });

  it('disables the under-input MFA switch during verification and retains the existing payload', async () => {
    auth.login.mockResolvedValueOnce({ requires_2fa: true, mfa_method: 'authenticator', temp_token: 'app-challenge' });
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'FINANCE001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'synthetic' } });
    fireEvent.submit(container.querySelector('form'));
    const input = await screen.findByRole('textbox', { name: 'Verification code' });
    const recoverySwitch = screen.getByRole('button', { name: 'Use a recovery code' });
    fireEvent.change(input, { target: { value: '123456' } });
    let fail;
    api.post.mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));
    fireEvent.submit(container.querySelector('form'));
    expect(recoverySwitch).toBeDisabled();
    expect(input).toBeDisabled();
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', { temp_token: 'app-challenge', otp: '123456' });
    await act(async () => { fail({ response: { data: { error: 'Invalid verification code.' } } }); });
    expect(input).toHaveValue('123456');
    expect(recoverySwitch).toBeEnabled();
    fireEvent.click(recoverySwitch);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/23-00123/), 'ADMIN001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    await screen.findByPlaceholderText('Enter 6-digit OTP');
    expect(screen.queryByRole('checkbox', { name: 'This is my personal browser — trust it for today' })).not.toBeInTheDocument();
    expect(auth.login).toHaveBeenCalledWith({ employeeId: 'ADMIN001', password: 'password123', sharedComputer: true });
  });

  it.each([false, true])('offers clerk trust only during verification with explicit opt-in (%s)', async optIn => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'personal-challenge', can_trust_browser: true });
    const { container } = renderPage(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/23-00123/), 'CLERK001');
    await user.type(container.querySelector('input[type=password]'), 'password123');
    await user.click(screen.getByRole('button', { name: 'LOGIN' }));
    const choice = await screen.findByRole('checkbox', { name: 'This is my personal browser — trust it for today' });
    expect(choice).not.toBeChecked();
    expect(screen.getByText(/until midnight Manila time/)).toBeInTheDocument();
    expect(auth.login).toHaveBeenCalledWith({ employeeId: 'CLERK001', password: 'password123', sharedComputer: true });
    if (optIn) await user.click(choice);
    await user.type(screen.getByPlaceholderText('Enter 6-digit OTP'), '123456');
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Synthetic rejection' } } });
    await user.click(screen.getByRole('button', { name: 'VERIFY & LOGIN' }));
    expect(api.post).toHaveBeenCalledWith('/auth/verify-2fa', { temp_token: 'personal-challenge', otp: '123456', ...(optIn ? { trust_browser: true } : {}) });
  });

  it('resets consent on a fresh OTP without saving unverified browser preference', async () => {
    vi.useFakeTimers();
    auth.login.mockResolvedValue({ requires_2fa: true, temp_token: 'personal-challenge', can_trust_browser: true });
    const { container } = renderPage(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText(/23-00123/), { target: { value: 'CLERK001' } });
    fireEvent.change(container.querySelector('input[type=password]'), { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')); });
    fireEvent.click(screen.getByRole('checkbox', { name: 'This is my personal browser — trust it for today' }));
    expect(screen.getByRole('checkbox', { name: 'This is my personal browser — trust it for today' })).toBeChecked();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resend OTP' })); });
    expect(auth.login).toHaveBeenLastCalledWith({ employeeId: 'CLERK001', password: 'password123', sharedComputer: true });
    expect(screen.getByRole('checkbox', { name: 'This is my personal browser — trust it for today' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Resend OTP (60s)' })).toBeDisabled();
  });

  it('preserves the registration proof and fields when confirmation is cancelled', async () => {
    const user=userEvent.setup();renderPage(<SignupPage/>);await signupAcademic();await signupPersonal();
    await user.click(screen.getByRole('checkbox',{name:/I have read and acknowledge/}));
    await user.upload(screen.getByLabelText('Proof of ID',{selector:'input'}),new File(['proof'],'id.png',{type:'image/png'}));
    await user.click(screen.getByRole('button',{name:'Create Account'}));expect(auth.register).not.toHaveBeenCalled();await user.keyboard('{Escape}');expect(screen.getByText(/Selected: id.png/)).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Create Account'}));await user.click(screen.getByRole('button',{name:'Submit Registration'}));await waitFor(()=>expect(auth.register).toHaveBeenCalledOnce());
    const payload=auth.register.mock.calls[0][0];expect(payload.get('employee_id')).toBe('STU-001');expect(payload.get('full_name')).toBe('Ana Reyes');expect(payload.get('first_name')).toBe('Ana');expect(payload.get('middle_name')).toBe('');expect(payload.get('last_name')).toBe('Reyes');expect(payload.get('course')).toBe('Engineering');expect(payload.get('college_id')).toBe('1');expect(payload.get('program')).toBe('BS Engineering');expect(payload.get('privacy_acknowledged')).toBe('true');expect(payload.get('privacy_notice_version')).toBe('2026-10-15.v1');expect(payload.get('password')).toBe('Password123_');expect(payload.get('id_proof').name).toBe('id.png');
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

  it('announces generic reset guidance with a copyable request reference', () => {
    Object.assign(reset, { done: true, message: 'Request received. Check Spam/Junk and contact the Registrar if nothing arrives.', requestReference: 'synthetic-reference' });
    try {
      renderPage(<ForgotPasswordPage />);
      expect(screen.getByRole('status')).toHaveTextContent('Request reference: synthetic-reference');
      expect(screen.getByRole('status')).toHaveTextContent('Check Spam/Junk');
      expect(screen.getByText('synthetic-reference')).toHaveClass('select-text');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/');
    } finally { Object.assign(reset, { done: false, message: '', requestReference: '' }); }
  });

  it('checks password matching before confirmation and keeps the token and new password payload', async () => {
    const user = userEvent.setup();
    renderPage(<ResetPasswordPage />, '/reset-password?token=test-token');
    const password = screen.getByLabelText('New Password');
    const repeat = screen.getByLabelText('Confirm New Password');
    await user.type(password, 'Password123!');
    await user.type(repeat, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reset.submitNewPassword).not.toHaveBeenCalled();
    await user.clear(repeat);
    await user.type(repeat, 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Confirm Password Reset' })).getByRole('button', { name: 'Cancel' }));
    expect(password).toHaveValue('Password123!');
    await user.click(screen.getByRole('button', { name: 'Set New Password' }));
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(reset.submitNewPassword).toHaveBeenCalledExactlyOnceWith('test-token', 'Password123!', 'Password123!');
  });
});

it('toggles reset password fields independently with keyboard accessible icons without submitting or losing drafts', async () => {
  const user = userEvent.setup();
  renderPage(<ResetPasswordPage />, '/reset-password?token=synthetic');
  const first = screen.getByLabelText('New Password'), second = screen.getByLabelText('Confirm New Password');
  fireEvent.change(first, { target: { value: 'Trace_2026' } });
  fireEvent.change(second, { target: { value: 'Trace_2026' } });
  const toggle = screen.getByRole('button', { name: 'Show new password' });
  toggle.focus(); await user.keyboard('{Enter}');
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(first).toHaveAttribute('type', 'text'); expect(second).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: 'Show confirmation password' }));
  expect(second).toHaveAttribute('type', 'text');
  await user.click(screen.getByRole('button', { name: 'Hide new password' }));
  expect(first).toHaveAttribute('type', 'password'); expect(second).toHaveAttribute('type', 'text');
  expect(first).toHaveValue('Trace_2026'); expect(second).toHaveValue('Trace_2026');
  expect(reset.submitNewPassword).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('offers alumni missing-proof review at the verification step without a separate options request',async()=>{
 api.get.mockRejectedValue(new Error('Options unavailable'));renderPage(<SignupPage/>);await signupAcademic('alumni');await signupPersonal();
 expect(screen.getByRole('checkbox',{name:/Records \/ proof unavailable/})).toBeInTheDocument();expect(api.get).not.toHaveBeenCalled();
});
it('reviews alumni missing proof, preserves its reason on cancel and sends saved years only on confirmation',async()=>{
 const user=userEvent.setup();renderPage(<SignupPage/>);await signupAcademic('alumni');await signupPersonal('Synthetic','Alumni');await user.click(screen.getByRole('checkbox',{name:/Records \/ proof unavailable/}));
 fireEvent.change(screen.getByLabelText('Explain Missing Proof'),{target:{value:'Records unavailable; Registrar review requested.'}});await user.click(screen.getByRole('checkbox',{name:/I have read and acknowledge/}));await user.click(screen.getByRole('button',{name:'Create Account'}));
 let review=screen.getByRole('dialog',{name:'Confirm Registration'});expect(review).toHaveTextContent('2010');expect(review).toHaveTextContent('2014');expect(review).toHaveTextContent('Unavailable — pending Admin identity review');expect(review).not.toHaveTextContent('Password123_');expect(auth.register).not.toHaveBeenCalled();
 await user.click(within(review).getByRole('button',{name:'Cancel'}));expect(screen.getByLabelText('Explain Missing Proof')).toHaveValue('Records unavailable; Registrar review requested.');
 await user.click(screen.getByRole('button',{name:'Create Account'}));await user.click(screen.getByRole('button',{name:'Submit Registration'}));await waitFor(()=>expect(auth.register).toHaveBeenCalledOnce());
 const payload=auth.register.mock.calls[0][0];expect(payload.get('year_started')).toBe('2010');expect(payload.get('graduation_year')).toBe('2014');expect(payload.get('registration_proof_unavailable')).toBe('true');expect(payload.has('id_proof')).toBe(false);
});
it('restores mandatory student proof when changing an alumni missing-proof draft to current student',async()=>{
 const user=userEvent.setup();renderPage(<SignupPage/>);await signupAcademic('alumni');await signupPersonal();await user.click(screen.getByRole('checkbox',{name:/Records \/ proof unavailable/}));
 await user.type(screen.getByLabelText('Explain Missing Proof'),'Lost records');await user.click(screen.getByRole('button',{name:'Back'}));await user.click(screen.getByRole('button',{name:'Back'}));await user.click(screen.getByRole('button',{name:'Current Student'}));
 fireEvent.change(screen.getByLabelText('Type of Student *'),{target:{value:'regular'}});fireEvent.change(screen.getByLabelText('Student ID *'),{target:{value:'STU-001'}});await user.click(screen.getByRole('button',{name:'Continue'}));await user.click(screen.getByRole('button',{name:'Continue'}));
 expect(screen.queryByRole('checkbox',{name:/proof unavailable/})).not.toBeInTheDocument();expect(screen.queryByLabelText('Explain Missing Proof')).not.toBeInTheDocument();expect(screen.getByText('Upload Proof of ID *')).toBeInTheDocument();expect(auth.register).not.toHaveBeenCalled();
});
