import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpPage from '@/pages/HelpPage';
import { TEXT_SIZE_KEY, applyTextSize, readTextSize, saveTextSize } from '@/utils/textSize';

beforeEach(() => localStorage.removeItem(TEXT_SIZE_KEY));
afterEach(() => { applyTextSize(100); localStorage.removeItem(TEXT_SIZE_KEY); });

describe('text-size preferences', () => {
  it.each([100, 125, 150, 200])('restores a saved %i%% size after reload initialization', size => {
    saveTextSize(size);
    applyTextSize(100);
    applyTextSize(readTextSize());
    expect(document.documentElement.style.fontSize).toBe(`${size}%`);
  });
  it('falls back safely for corrupt or unsupported stored sizes', () => {
    localStorage.setItem(TEXT_SIZE_KEY, '-999');
    expect(readTextSize()).toBe(100);
    localStorage.setItem(TEXT_SIZE_KEY, 'broken');
    expect(readTextSize()).toBe(100);
  });
  it('still changes size when browser storage is unavailable', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readTextSize()).toBe(100);
    expect(saveTextSize(150)).toBe(150);
    expect(document.documentElement.style.fontSize).toBe('150%');
  });
});

describe('expandable FAQ answers', () => {
  it.each([
    { role: 'student' }, { role: 'admin' }, { role: 'clerk', desk_assignment: 'Window 1' },
    { role: 'clerk', desk_assignment: 'Secretary' }, { role: 'clerk', desk_assignment: 'Finance' },
  ])('opens and closes the complete preference guidance for %j', async user => {
    render(<HelpPage user={user} />);
    const summary = screen.getByText('How do I change appearance and text size?');
    await userEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(screen.getByText(/Changes apply across TRACE immediately/)).toBeVisible();
    await userEvent.click(summary);
    expect(summary.closest('details')).not.toHaveAttribute('open');
  });
});
