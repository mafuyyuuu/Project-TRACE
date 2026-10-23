import { StrictMode, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act,render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';

describe('ModalShell', () => {
  it('follows a shrinking visual viewport while preserving a draft and pinned actions',()=>{
    const view=new EventTarget();Object.assign(view,{width:375,height:812,offsetTop:0,offsetLeft:0});vi.stubGlobal('visualViewport',view);
    const {unmount}=render(<ModalShell open title="Keyboard form" showCloseButton={false} onClose={vi.fn()} footer={<button>Save draft</button>}><input aria-label="Draft" defaultValue="Keep typed value"/></ModalShell>);
    const field=screen.getByRole('textbox'),body=field.closest('.trace-modal-body');field.getBoundingClientRect=()=>({top:340,bottom:380});body.getBoundingClientRect=()=>({top:100,bottom:320});
    act(()=>{view.height=400;view.offsetTop=12;view.dispatchEvent(new Event('resize'));});
    expect(screen.getByRole('dialog').parentElement.style.height).toBe('400px');expect(field).toHaveValue('Keep typed value');expect(body.scrollTop).toBe(72);expect(body).not.toContainElement(screen.getByRole('button',{name:'Save draft'}));
    unmount();vi.unstubAllGlobals();
  });
  it('portals into the body and keeps its footer outside the scrolling content', () => {
    const { container } = render(
      <ModalShell open title="Long form" onClose={vi.fn()} footer={<button>Save</button>}>
        <p>Scrollable content</p>
      </ModalShell>
    );
    const dialog = screen.getByRole('dialog', { name: 'Long form' });
    expect(container).not.toContainElement(dialog);
    const body = screen.getByText('Scrollable content').parentElement;
    const footer = screen.getByRole('button', { name: 'Save' }).parentElement;
    expect(body).toHaveClass('trace-modal-body');
    expect(footer).toHaveClass('trace-modal-footer');
    expect(body).not.toContainElement(footer);
    expect(footer.parentElement).toBe(body.parentElement);
  });

  it('wraps focus in both directions and skips hidden and disabled controls', async () => {
    const user = userEvent.setup();
    render(
      <ModalShell open title="Form" showCloseButton={false} onClose={vi.fn()}>
        <style>{'.hidden { display: none; }'}</style>
        <button hidden>Hidden</button>
        <div className="hidden"><button>Also hidden</button></div>
        <fieldset disabled><button>Disabled by fieldset</button></fieldset>
        <button>First</button>
        <button>Last</button>
      </ModalShell>
    );
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
  });

  it('keeps focus on the panel when there are no enabled controls', async () => {
    const user = userEvent.setup();
    render(<ModalShell open title="Busy" showCloseButton={false} onClose={vi.fn()}><button disabled>Saving</button></ModalShell>);
    const dialog = screen.getByRole('dialog', { name: 'Busy' });
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(dialog).toHaveFocus();
  });

  it('prevents programmatic focus from escaping to the page', () => {
    render(<><button>Outside</button><ModalShell open title="Form" onClose={vi.fn()}><button>Inside</button></ModalShell></>);
    screen.getByRole('button', { name: 'Outside' }).focus();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
  });

  it('closes only the topmost dialog on Escape and restores focus through the stack', async () => {
    const user = userEvent.setup();
    function StackedDialogs() {
      const [formOpen, setFormOpen] = useState(false);
      const [confirmOpen, setConfirmOpen] = useState(false);
      return (
        <>
          <button onClick={() => setFormOpen(true)}>Open form</button>
          <ModalShell open={formOpen} title="Form" onClose={() => setFormOpen(false)}>
            <button onClick={() => setConfirmOpen(true)}>Submit form</button>
          </ModalShell>
          <ConfirmDialog open={confirmOpen} title="Confirm submission" message="Continue?" onCancel={() => setConfirmOpen(false)} onConfirm={vi.fn()} />
        </>
      );
    }
    render(<StrictMode><StackedDialogs /></StrictMode>);
    const trigger = screen.getByRole('button', { name: 'Open form' });
    await user.click(trigger);
    const submit = screen.getByRole('button', { name: 'Submit form' });
    await user.click(submit);
    const confirm = screen.getByRole('dialog', { name: 'Confirm submission' });
    expect(confirm).toContainElement(document.activeElement);
    await user.tab({ shift: true });
    await user.tab();
    expect(confirm).toContainElement(document.activeElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Confirm submission' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Form' })).toBeInTheDocument();
    expect(submit).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not treat a click within the panel as a backdrop click', () => {
    const onClose = vi.fn();
    render(<ModalShell open title="Form" onClose={onClose}><p>Content</p></ModalShell>);
    fireEvent.click(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog').previousElementSibling);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
