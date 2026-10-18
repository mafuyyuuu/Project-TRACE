import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import InfoButton from '@/components/InfoButton';
import ModalShell from '@/components/ModalShell';

it('opens with the keyboard and returns focus after Escape', async () => {
  const user = userEvent.setup();
  render(<InfoButton title="About this value"><p>Detailed explanation.</p></InfoButton>);
  expect(screen.queryByText('Detailed explanation.')).not.toBeInTheDocument();
  await user.tab();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('dialog', { name: 'About this value' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'About this value' })).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'About this value' })).toHaveFocus();
});

it('dismisses nested information without closing the forecast behind it', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<ModalShell open onClose={onClose} title="Forecast"><InfoButton title="About this forecast"><p>Source details.</p></InfoButton></ModalShell>);
  await user.click(screen.getByRole('button', { name: 'About this forecast' }));
  const info = screen.getByRole('dialog', { name: 'About this forecast' });
  await user.click(within(info).getByRole('button', { name: 'Close', exact: true }));
  expect(screen.getByRole('dialog', { name: 'Forecast' })).toBeVisible();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'About this forecast' })).toHaveFocus();
});
