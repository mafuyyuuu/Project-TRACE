/**
 * A horizontal, brand-green segmented tab bar for switching between several
 * queue tables shown one at a time, instead of stacking them all vertically.
 *
 * Presentational only — the caller owns which table's content renders for
 * the active tab.
 */
import Button from '@/components/Button';

export default function QueueTabs({ tabs, activeKey, onChange, label = 'Queue filters', semantics = 'tabs', idPrefix, showZeroCounts = false }) {
  const tablist = semantics === 'tabs';
  return (
    <div id={idPrefix || 'tutorial-queues'} className="trace-tab-group" role={tablist ? 'tablist' : 'group'} aria-label={label}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Button
            key={tab.key}
            type="button"
            id={idPrefix ? `${idPrefix}-${tab.key}` : undefined}
            role={tablist ? 'tab' : undefined}
            aria-selected={tablist ? isActive : undefined}
            aria-pressed={tablist ? undefined : isActive}
            aria-controls={idPrefix && tablist ? `${idPrefix}-panel` : undefined}
            tabIndex={tablist && !isActive ? -1 : 0}
            motion="lift"
            onKeyDown={(event) => {
              const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = tabs.findIndex((item) => item.key === tab.key);
              const nextIndex = event.key === 'Home' ? 0
                : event.key === 'End' ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              onChange(tabs[nextIndex].key);
              event.currentTarget.parentElement.querySelectorAll('button')[nextIndex]?.focus();
            }}
            onClick={() => onChange(tab.key)}
            className={`trace-tab trace-pill ${
              isActive ? 'trace-pill-active' : 'trace-pill-inactive'
            }`}
          >
            <span className="min-w-0 break-words">{tab.label}</span>
            {tab.count != null && (tab.count > 0 || showZeroCounts) && (
              <span className={`min-w-5 min-h-5 px-1 shrink-0 flex items-center justify-center rounded-full text-[10px] leading-normal ${
                isActive ? 'bg-white dark:bg-gray-900 text-[#15803d] dark:text-green-300' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
