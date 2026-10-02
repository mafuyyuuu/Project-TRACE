/**
 * A horizontal, brand-green segmented tab bar for switching between several
 * queue tables shown one at a time, instead of stacking them all vertically.
 *
 * Presentational only — the caller owns which table's content renders for
 * the active tab.
 */
export default function QueueTabs({ tabs, activeKey, onChange }) {
  return (
    <div id="tutorial-queues" className="flex flex-wrap w-fit max-w-full bg-gray-100 dark:bg-gray-800 rounded-3xl sm:rounded-full p-1.5 gap-1 mt-8" role="tablist" aria-label="Queue filters">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(event) => {
              const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = tabs.findIndex((item) => item.key === tab.key);
              const nextIndex = event.key === 'Home' ? 0
                : event.key === 'End' ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              onChange(tabs[nextIndex].key);
              event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
            }}
            onClick={() => onChange(tab.key)}
            className={`flex min-w-0 max-w-full items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <span className="break-words">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`min-w-5 h-5 px-1 shrink-0 flex items-center justify-center rounded-full text-[10px] ${
                isActive ? 'bg-white dark:bg-gray-900 text-[#15803d] dark:text-green-300' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
