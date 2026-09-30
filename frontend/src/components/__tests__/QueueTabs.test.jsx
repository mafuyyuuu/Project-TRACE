import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QueueTabs from '@/components/QueueTabs';

const tabs = [
  { key: 'pending', label: 'Pending', count: 125 },
  { key: 'approved', label: 'Approved', count: 2 },
  { key: 'rejected', label: 'Rejected', count: 0 },
];

function Queues() {
  const [activeKey, onChange] = useState('pending');
  return <QueueTabs tabs={tabs} activeKey={activeKey} onChange={onChange} />;
}

describe('QueueTabs keyboard navigation', () => {
  it('moves selection and focus with arrows, wrapping at both ends', () => {
    render(<Queues />);
    const controls = screen.getAllByRole('tab');
    controls[0].focus();
    fireEvent.keyDown(controls[0], { key: 'ArrowLeft' });
    expect(controls[2]).toHaveFocus();
    expect(controls[2]).toHaveAttribute('aria-selected', 'true');
    expect(controls[2]).toHaveAttribute('tabindex', '0');
    expect(controls[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(controls[2], { key: 'ArrowRight' });
    expect(controls[0]).toHaveFocus();
    expect(controls[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('supports Home, End, and pointer selection', () => {
    render(<Queues />);
    const controls = screen.getAllByRole('tab');
    fireEvent.keyDown(controls[0], { key: 'End' });
    expect(controls[2]).toHaveFocus();
    fireEvent.keyDown(controls[2], { key: 'Home' });
    expect(controls[0]).toHaveFocus();
    fireEvent.click(controls[1]);
    expect(controls[1]).toHaveAttribute('aria-selected', 'true');
  });
});
