import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import plpLogo from '@/assets/plp-login-logo.png'

it('uses the supplied PLP logo with proportional sizing and an accessible home link', () => {
  render(<MemoryRouter><AuthShell title="Sign in"><button>Continue</button></AuthShell></MemoryRouter>)
  const home = screen.getByRole('link', { name: 'TRACE — PLP Registrar' })
  expect(home).toHaveAttribute('href', '/')
  const logo = within(home).getByRole('img', { name: 'Pamantasan ng Lungsod ng Pasig logo' })
  expect(logo).toHaveAttribute('src', plpLogo)
  expect(logo).toHaveClass('object-contain', 'h-20', 'w-20')
  expect(screen.queryByRole('img', { name: 'TRACE logo' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
})
