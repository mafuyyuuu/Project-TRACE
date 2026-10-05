import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import { TRACE_BRANDING } from '@/utils/branding'

it('uses the approved theme variants and accessible branding on authentication pages', () => {
  render(<MemoryRouter><AuthShell title="Sign in"><button>Continue</button></AuthShell></MemoryRouter>)
  const home = screen.getByRole('link', { name: 'TRACE — PLP Registrar' })
  expect(home).toHaveAttribute('href', '/')
  const logo = within(home).getByRole('img', { name: 'TRACE logo' })
  expect(logo).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet')
  const images = logo.querySelectorAll('image')
  expect(images[0]).toHaveAttribute('href', TRACE_BRANDING.light)
  expect(images[0]).toHaveClass('dark:hidden')
  expect(images[1]).toHaveAttribute('href', TRACE_BRANDING.dark)
  expect(images[1]).toHaveClass('dark:block')
  expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
})
