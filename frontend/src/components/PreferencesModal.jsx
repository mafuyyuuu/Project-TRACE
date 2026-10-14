import Button from '@/components/Button';
import { useId } from 'react';
import ModalShell from '@/components/ModalShell';
import { TEXT_SIZES } from '@/utils/textSize';

export default function PreferencesModal({ onClose, darkMode, onToggleTheme, textSize, onTextSizeChange, admin = false }) {
  const appearanceId = useId();
  const textSizeId = useId();
  const textSizeHelpId = useId();

  return (
    <ModalShell open onClose={onClose} maxWidth={admin ? 'max-w-[560px]' : 'max-w-xl'}
      title={admin ? 'Preferences' : <span className="inline-block max-w-full text-base leading-tight sm:text-lg">Preferences</span>}
      footer={admin ? <div className="trace-actions justify-end"><Button type="button" onClick={onClose} className="trace-button trace-button-primary">Done</Button></div> : undefined}>
      <div className="min-w-0 space-y-6 text-gray-900 dark:text-gray-100">
        <section aria-labelledby={appearanceId} className="min-w-0 space-y-3">
          <div className="space-y-2">
            <h4 id={appearanceId} className="trace-label">Appearance</h4>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Choose how TRACE looks on this device.</p>
          </div>
          {admin ? <div className="grid grid-cols-2 gap-3">{[['Light', false], ['Dark', true]].map(([label, selectedDark]) => <Button key={label} type="button" aria-pressed={darkMode === selectedDark} disabled={!onToggleTheme} onClick={() => { if (darkMode !== selectedDark) onToggleTheme(); }} className={`trace-action flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border px-4 py-5 text-sm ${darkMode === selectedDark ? 'border-trace-emerald bg-emerald-50 font-semibold text-trace-emerald dark:bg-green-950 dark:text-green-300' : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{selectedDark ? <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}</svg>{label}</Button>)}</div> : <Button type="button" aria-pressed={darkMode} onClick={onToggleTheme} disabled={!onToggleTheme}
            className="trace-button trace-button-secondary w-full min-w-0 enabled:active:bg-gray-200 dark:enabled:active:bg-gray-700 aria-pressed:enabled:active:bg-green-900 dark:aria-pressed:enabled:active:bg-green-900">
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>}
        </section>
        <section aria-labelledby={textSizeId} className="min-w-0 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="space-y-2">
            <label id={textSizeId} htmlFor={`${textSizeId}-control`} className="trace-label">Text size</label>
            <p id={textSizeHelpId} className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Default: 100%. Larger text applies to menus, forms, tables and chat.</p>
          </div>
          <select id={`${textSizeId}-control`} value={textSize} aria-describedby={textSizeHelpId}
            disabled={!onTextSizeChange} onChange={event => onTextSizeChange?.(event.target.value)} className="trace-control">
            {TEXT_SIZES.map(size => <option key={size} value={size}>{size}%</option>)}
          </select>
          {admin && <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-[0.625rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Preview</p><p className="text-sm leading-relaxed">The quick brown fox jumps over the lazy dog.</p></div>}
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Saved automatically on this browser. Printed documents keep their original formatting.</p>
        </section>
      </div>
    </ModalShell>
  );
}
