/**
 * A horizontal, brand-green segmented tab bar for switching between several
 * queue tables shown one at a time, instead of stacking them all vertically.
 *
 * Presentational only — the caller owns which table's content renders for
 * the active tab.
 */
export default function QueueTabs({ tabs, activeKey, onChange }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-full p-1.5 gap-1 mt-8" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
                isActive ? 'bg-white text-[#15803d]' : 'bg-gray-300 text-gray-700'
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
