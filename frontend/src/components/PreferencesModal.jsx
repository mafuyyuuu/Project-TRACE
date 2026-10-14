import Button from '@/components/Button';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { useId } from 'react';
import ModalShell from '@/components/ModalShell';
import { TEXT_SIZES } from '@/utils/textSize';

export default function PreferencesModal({ onClose, darkMode, onToggleTheme, textSize, onTextSizeChange, admin = false }) {
  const appearanceId = useId();
  const textSizeId = useId();
  const textSizeHelpId = useId();

  return (
    <ModalShell open onClose={onClose} maxWidth={admin ? 'max-w-[560px]' : 'max-w-xl'}
      panelClassName={admin ? 'trace-modal-panel trace-admin-main-dialog trace-admin-preferences max-w-[560px]' : undefined}
      title={admin ? 'Preferences' : <span className="inline-block max-w-full text-base leading-tight sm:text-lg">Preferences</span>}
      footer={admin ? <div className="trace-actions justify-end"><Button type="button" onClick={onClose} className="trace-button trace-button-primary">Done</Button></div> : undefined}>
      <div className="min-w-0 space-y-6 text-gray-900 dark:text-gray-100">
        <section aria-labelledby={appearanceId} className="min-w-0 space-y-3">
          <div className="space-y-2">
            <h4 id={appearanceId} className="trace-admin-security-heading trace-label">{admin && <span className="trace-admin-security-icon"><AdminIcon name="preferences-sun" /></span>}Appearance</h4>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Choose how TRACE looks on this device.</p>
          </div>
          {admin ? <div className="grid grid-cols-2 gap-3">{[['Light', false], ['Dark', true]].map(([label, selectedDark]) => <Button key={label} type="button" aria-pressed={darkMode === selectedDark} disabled={!onToggleTheme} onClick={() => { if (darkMode !== selectedDark) onToggleTheme(); }} className={'trace-action trace-admin-theme-choice ' + (darkMode === selectedDark ? 'trace-admin-theme-selected' : '')}><span aria-hidden="true" className={'trace-admin-theme-sample ' + (selectedDark ? 'bg-gray-800' : 'bg-[#f4f6f8]')}><span /><span /><span /></span><span className="flex w-full items-center justify-between gap-2"><span className="flex items-center gap-2"><AdminIcon name={selectedDark ? 'preferences-moon' : 'preferences-sun1'} />{label}</span>{darkMode === selectedDark ? <AdminIcon name="preferences-check" /> : <span aria-hidden="true" className="h-[18px] w-[18px] rounded-full border border-slate-300" />}</span></Button>)}</div> : <Button type="button" aria-pressed={darkMode} onClick={onToggleTheme} disabled={!onToggleTheme}
            className="trace-button trace-button-secondary w-full min-w-0 enabled:active:bg-gray-200 dark:enabled:active:bg-gray-700 aria-pressed:enabled:active:bg-green-900 dark:aria-pressed:enabled:active:bg-green-900">
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>}
        </section>
        <section aria-labelledby={textSizeId} className="min-w-0 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="space-y-2">
            <label id={textSizeId} htmlFor={`${textSizeId}-control`} className="trace-admin-security-heading trace-label">{admin && <span className="trace-admin-security-icon"><AdminIcon name="preferences-type" /></span>}Text size</label>
            <p id={textSizeHelpId} className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Default: 100%. Larger text applies to menus, forms, tables and chat.</p>
          </div>
          <select id={`${textSizeId}-control`} value={textSize} aria-describedby={textSizeHelpId}
            disabled={!onTextSizeChange} onChange={event => onTextSizeChange?.(event.target.value)} className="trace-control">
            {TEXT_SIZES.map(size => <option key={size} value={size}>{size}%{admin && size === 100 ? ' (Default)' : ''}</option>)}
          </select>
          {admin && <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-[0.625rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Preview</p><p className="text-sm leading-relaxed">The quick brown fox jumps over the lazy dog.</p></div>}
          <p className="flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{admin && <AdminIcon name="preferences-check1" />}Saved automatically on this browser. Printed documents keep their original formatting.</p>
        </section>
      </div>
    </ModalShell>
  );
}
