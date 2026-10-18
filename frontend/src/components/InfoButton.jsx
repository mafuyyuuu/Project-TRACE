import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';

/** Click/tap help with the shared dialog's focus trap, Escape and focus return. */
export default function InfoButton({ title, children, maxWidth = 'max-w-lg' }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" aria-label={title} title={title} aria-haspopup="dialog" aria-expanded={open}
      className="trace-icon-button" onClick={() => setOpen(true)}>
      <img src="/admin-figma/info.svg" width="18" height="18" alt="" aria-hidden="true" />
    </Button>
    <ModalShell open={open} onClose={() => setOpen(false)} title={title} maxWidth={maxWidth}>
      <div className="space-y-3 text-sm text-trace-ink dark:text-gray-300">{children}</div>
    </ModalShell>
  </>;
}
