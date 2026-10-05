import Button from '@/components/Button';
import { useId } from 'react';
import ModalShell from '@/components/ModalShell';
import { TEXT_SIZES } from '@/utils/textSize';

export default function PreferencesModal({ onClose, darkMode, onToggleTheme, textSize, onTextSizeChange }) {
  const appearanceId = useId();
  const textSizeId = useId();
  const textSizeHelpId = useId();

  return (
    <ModalShell open onClose={onClose} maxWidth="max-w-xl"
      title={<span className="inline-block max-w-full text-base leading-tight sm:text-lg">Preferences</span>}>
      <div className="min-w-0 space-y-6 text-gray-900 dark:text-gray-100">
        <section aria-labelledby={appearanceId} className="min-w-0 space-y-3">
          <div className="space-y-2">
            <h4 id={appearanceId} className="trace-label">Appearance</h4>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Choose how TRACE looks on this device.</p>
          </div>
          <Button type="button" aria-pressed={darkMode} onClick={onToggleTheme} disabled={!onToggleTheme}
            className="trace-button trace-button-secondary w-full min-w-0 enabled:active:bg-gray-200 dark:enabled:active:bg-gray-700 aria-pressed:enabled:active:bg-green-900 dark:aria-pressed:enabled:active:bg-green-900">
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>
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
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Saved automatically on this browser. Printed documents keep their original formatting.</p>
        </section>
      </div>
    </ModalShell>
  );
}
