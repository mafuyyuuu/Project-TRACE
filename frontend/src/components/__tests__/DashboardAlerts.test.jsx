import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardAlerts from '@/components/DashboardAlerts';
import ModalShell from '@/components/ModalShell';

describe('DashboardAlerts', () => {
  it('dismisses on navigation while preserving the underlying draft', () => {
    function Form() {
      const [message, setMessage] = useState('Saved');
      return <><ModalShell open title="Draft" onClose={vi.fn()}><input aria-label="Draft note" defaultValue="Keep me" /></ModalShell>
        <DashboardAlerts success={message} onDismiss={() => setMessage('')} /></>;
    }
    render(<Form />);
    fireEvent(window, new Event('trace:notification-navigation'));
    expect(screen.queryByRole('dialog', { name: 'Success' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Draft note')).toHaveValue('Keep me');
  });
  it('announces feedback outside the app stacking context while a modal stays open', () => {
    const { container } = render(
      <div className="relative z-0">
        <ModalShell open title="Intake Check" onClose={vi.fn()} footer={<button>Return to Student</button>}><p>Request details</p></ModalShell>
        <DashboardAlerts success="Saved" error="Attach the receipt first." onDismiss={vi.fn()} />
      </div>
    );
    expect(screen.getByRole('dialog', { name: 'Intake Check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Student' })).toBeInTheDocument();
    const error = screen.getByRole('alert');
    expect(container).not.toContainElement(error);
    expect(error).toHaveTextContent('Attach the receipt first.');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    const feedback = screen.getByRole('dialog', { name: 'Attention Needed' });
    expect(feedback).toContainElement(error);
    expect(feedback.parentElement).toHaveClass('trace-modal-overlay', 'z-[110]');
    expect(screen.getByRole('dialog', { name: 'Intake Check' }).parentElement).toHaveClass('trace-modal-overlay', 'z-[100]');
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
  });

  it('acknowledges feedback and removes its dialog when messages clear', () => {
    const dismiss = vi.fn();
    const { rerender } = render(<DashboardAlerts error="Missing receipt" onDismiss={dismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(dismiss).toHaveBeenCalledOnce();
    rerender(<DashboardAlerts />);
    expect(screen.queryByRole('dialog', { name: 'Attention Needed' })).not.toBeInTheDocument();
  });

  it.each(['OK', 'Escape', 'backdrop'])('dismisses with %s without closing the underlying form', (method) => {
    const closeForm = vi.fn();
    function FormWithFeedback() {
      const [error, setError] = useState('');
      return (
        <>
          <ModalShell open title="Receipt form" onClose={closeForm} footer={<button onClick={() => setError('Attach a receipt.')}>Validate</button>}>
            <input aria-label="Receipt reference" defaultValue="OR-123" />
          </ModalShell>
          <DashboardAlerts error={error} onDismiss={() => setError('')} />
        </>
      );
    }
    render(<FormWithFeedback />);
    const validate = screen.getByRole('button', { name: 'Validate' });
    validate.focus();
    fireEvent.click(validate);
    const feedback = screen.getByRole('dialog', { name: 'Attention Needed' });
    const acknowledge = screen.getByRole('button', { name: 'OK' });
    expect(acknowledge).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(acknowledge).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(acknowledge).toHaveFocus();
    screen.getByRole('button', { name: 'Close' }).focus();
    expect(acknowledge).toHaveFocus();
    if (method === 'OK') fireEvent.click(acknowledge);
    else if (method === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
    else fireEvent.click(feedback.previousElementSibling);
    expect(screen.queryByRole('dialog', { name: 'Attention Needed' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Receipt form' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Receipt reference' })).toHaveValue('OR-123');
    expect(validate).toHaveFocus();
    expect(closeForm).not.toHaveBeenCalled();
  });
});
