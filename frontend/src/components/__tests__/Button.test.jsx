import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from '@/components/Button';

describe('shared button presentation', () => {
  it.each(['primary', 'secondary', 'danger', 'warning', 'info', 'inverse'])('preserves %s styling and native props/ref', variant => {
    const ref = createRef();
    const action = vi.fn();
    render(<Button ref={ref} type="button" id="action" className={`trace-button trace-button-${variant}`} aria-label="Action" onClick={action}><svg aria-hidden="true" />Action</Button>);
    const button = screen.getByRole('button', { name: 'Action' });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass(`trace-button-${variant}`, 'trace-button-motion');
    expect(button).toHaveAttribute('id', 'action');
    expect(button.querySelector('.trace-button-visual')).toHaveTextContent('Action');
    fireEvent.click(button);
    expect(action).toHaveBeenCalledOnce();
  });

  it('keeps submit/form association and keyboard activation', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(event => event.preventDefault());
    render(<><form id="profile" onSubmit={submit} /><Button form="profile" type="submit" className="trace-button">Save profile</Button></>);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledOnce();
  });

  it('retains native disabled/loading behavior without adding action timers', async () => {
    const action = vi.fn();
    const { rerender } = render(<Button disabled aria-busy="true" className="trace-button" onClick={action}>Saving…</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<Button className="trace-button" onClick={action}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(action).toHaveBeenCalledOnce();
  });

  it('does not lift tabs, inline actions or card selectors', () => {
    render(<Button className="trace-tab" aria-pressed="true">Selected tab</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button')).not.toHaveClass('trace-button-motion');
    expect(screen.getByRole('button').querySelector('.trace-button-visual')).toBeNull();
  });

  it('supports existing icon and local boxed geometry without changing labels', () => {
    render(<Button className="trace-button-lift absolute w-8 h-8" aria-label="Change photo"><svg aria-hidden="true" /></Button>);
    expect(screen.getByRole('button', { name: 'Change photo' })).toHaveClass('absolute', 'w-8', 'h-8', 'trace-button-motion');
  });
});
