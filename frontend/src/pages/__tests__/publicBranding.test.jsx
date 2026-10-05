import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import StaffAuthenticatorSetupPage from '@/pages/StaffAuthenticatorSetupPage'
import plpLogo from '@/assets/plp-login-logo.png'

vi.mock('@/hooks/useAuth', () => ({ default: () => ({ loading: false, error: '', login: vi.fn(), register: vi.fn() }) }))
vi.mock('@/hooks/usePasswordReset', () => ({ default: () => ({ loading: false, error: '', done: false }) }))
vi.mock('@/hooks/useStaffEnrollment', () => ({ default: () => ({ busy: false, error: '', codes: [], setup: null }) }))
vi.mock('@/hooks/useSignupOcr', () => ({ default: () => ({ loading: false, error: '' }) }))
vi.mock('@/services/referenceService', () => ({ getColleges: vi.fn().mockResolvedValue({ colleges: [{ id: 1, name: 'Test College' }] }) }))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

it.each([
  ['Login and welcome', LoginPage, '/'],
  ['Student signup', SignupPage, '/signup'],
  ['Alumni signup', SignupPage, '/signup?applicant=alumni'],
  ['Forgot Password', ForgotPasswordPage, '/forgot-password'],
  ['Reset Password', ResetPasswordPage, '/reset-password'],
  ['Email verification', VerifyEmailPage, '/verify-email'],
  ['Staff authenticator setup', StaffAuthenticatorSetupPage, '/staff-setup'],
])('shows only the supplied PLP branding on %s', async (_name, Page, path) => {
  window.history.replaceState(null, '', path)
  render(<MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>)
  const logos = screen.getAllByRole('img', { name: 'Pamantasan ng Lungsod ng Pasig logo' })
  expect(logos).toHaveLength(1)
  expect(logos[0]).toHaveAttribute('src', plpLogo)
  expect(logos[0]).toHaveAttribute('width', '500')
  expect(logos[0]).toHaveAttribute('height', '500')
  expect(logos[0]).toHaveClass('object-contain')
  expect(screen.queryByRole('img', { name: 'TRACE logo' })).not.toBeInTheDocument()
  if (Page === SignupPage) {
    await screen.findByRole('option', { name: 'Test College' })
    expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/')
  }
  if (Page === VerifyEmailPage) await screen.findByRole('alert')
})
