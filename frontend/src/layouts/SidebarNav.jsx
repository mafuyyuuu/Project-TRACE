import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canonicalTabForUser, navGroupsForUser } from '@/utils/navigation';
import useMotion from '@/hooks/useMotion';
import useSidebarTooltip from '@/hooks/useSidebarTooltip';
import SidebarTooltip from '@/components/SidebarTooltip';

/**
 * The role-aware navigation list, rendered twice: as the icon-only desktop
 * rail and as the labelled mobile drawer. Keeping one definition means a new
 * tab can never appear on one and be missing from the other.
 *
 * Presentational only — it receives the user and takes no data of its own.
 *
 * @param {object} props
 * @param {object} props.user      the signed-in account
 * @param {string} props.tab       the active `?tab=` value
 * @param {boolean} props.showLabels  drawer style (labels) vs rail style (icons)
 * @param {() => void} props.onNavigate  called after any nav action, to close the drawer
 * @param {() => void} props.onOpenSettings
 * @param {() => void} props.onLogout
 */

// Each icon is a path set rather than a component so the list below stays readable.
const ICONS = {
  more: <><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" /></>,
  back: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 5-7 7 7 7M5 12h15" />,
  message: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-8.5A8.5 8.5 0 0 1 10.5 5H19a2 2 0 0 1 2 2v4.5ZM7 10h9M7 14h6" />,
  book: <><path strokeWidth="2" strokeLinejoin="round" d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path strokeWidth="2" d="M12 6v14"/></>,
  shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6" />,
  template: <><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" /><path strokeLinecap="round" strokeWidth="2" d="M3 8h18M8 8v13M12 12h5M12 16h5" /></>,
  dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>,
  document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>,
  card: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>,
  cap: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422A12.083 12.083 0 0112 20.055a12.083 12.083 0 01-6.16-9.477L12 14z"/></>,
  checklist: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>,
  users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>,
  report: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>,
  bolt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>,
  cog: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></>,
  wrench: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.867 19.125h.008v.008h-.008v-.008z"/></>,
  logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>,
};

function Icon({ name, className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {ICONS[name]}
    </svg>
  );
}

export default function SidebarNav({
  user,
  tab: requestedTab,
  revealTab,
  showLabels = false,
  onNavigate = () => {},
  onOpenSettings,
  onLogout,
}) {
  const groups = navGroupsForUser(user);
  const tab = canonicalTabForUser(user, requestedTab);
  const location = useLocation();
  const activeGroup = groups.more.some(item => item.tab === tab) ? 'more' : 'main';
  const context = `${location.key}:${user?.id}:${user?.role}:${user?.desk_assignment}:${user?.user_type}:${tab}`;
  const [selection, setSelection] = useState({ context, group: activeGroup });
  // A direct link, browser Back/Forward or account change reveals its group.
  // Adjust during render so the active destination never flashes hidden.
  if (selection.context !== context) setSelection({ context, group: activeGroup });
  const group = revealTab
    ? groups.more.some(item => item.tab === revealTab) ? 'more' : 'main'
    : selection.context === context ? selection.group : activeGroup;
  const navRef = useRef(null);
  const rootRef = useRef(null);
  const tooltip = useSidebarTooltip(rootRef, context + ':' + group, !showLabels);
  useMotion(navRef, group, 'context', { initial: false });
  const focusAfterSwitch = useRef(false);
  useLayoutEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    if (focusAfterSwitch.current) {
      focusAfterSwitch.current = false;
      (active || navRef.current?.querySelector('a, button'))?.focus();
    }
  }, [context, group]);

  const switchGroup = () => {
    focusAfterSwitch.current = true;
    setSelection({ context, group: group === 'main' ? 'more' : 'main' });
  };

  const linkClass = (isActive) =>
    showLabels
      ? `trace-nav-item w-full gap-3 px-4 py-3 text-sm font-bold leading-normal ${
          isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
        }`
      : `trace-nav-item trace-nav-icon-control w-12 h-12 justify-center ${
          isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-500 dark:text-gray-400'
        }`;

  const actionClass = (danger) =>
    showLabels
      ? `trace-nav-item w-full gap-3 px-4 py-3 text-sm font-bold leading-normal text-gray-500 dark:text-gray-400 ${
          danger ? 'hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
        }`
      : `trace-nav-item trace-nav-icon-control w-12 h-12 justify-center text-gray-400 dark:text-gray-400 ${
          danger ? 'text-red-600 dark:text-red-300' : ''
        }`;

  const moreIsActive = group === 'main' && activeGroup === 'more';
  const groupActionLabel = group === 'main' ? 'More' : 'Back to main';
  const groupTooltipLabel = moreIsActive
    ? `More — current page: ${groups.more.find(item => item.tab === tab)?.label}`
    : groupActionLabel;

  return (
    <div ref={rootRef} {...tooltip.rootEvents} className="flex min-h-full shrink-0 flex-col justify-between gap-6">
      <nav ref={navRef} aria-label={group === 'main' ? 'Main navigation' : 'More navigation'} className="flex shrink-0 flex-col gap-2">
        <span className={showLabels ? 'px-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400' : 'sr-only'}>{group === 'main' ? 'Main' : 'More'}</span>
        {groups[group].map((item) => (
          <Link
            key={item.tab}
            data-guide-tab={item.tab}
            to={item.to}
            onClick={onNavigate}
            data-nav-label={item.label}
            aria-describedby={tooltip.description(item.label)}
            aria-label={item.label}
            aria-current={tab === item.tab ? 'page' : undefined}
            className={linkClass(tab === item.tab)}
          >
            <Icon name={item.icon} className="trace-nav-icon w-6 h-6 shrink-0" />
            {showLabels && <span>{item.label}</span>}
          </Link>
        ))}
        {groups.more.length > 0 && <button
          type="button"
          onClick={switchGroup}
          aria-label={groupActionLabel}
          data-nav-label={groupTooltipLabel}
          aria-describedby={tooltip.description(groupTooltipLabel)}
          data-nav-selected={moreIsActive || undefined}
          className={linkClass(moreIsActive)}
        >
          <Icon name={group === 'main' ? 'more' : 'back'} className="trace-nav-icon w-6 h-6 shrink-0" />
          {showLabels && <span>{group === 'main' ? 'More' : 'Back to main'}</span>}
          {group === 'main' && activeGroup === 'more' && <span className="sr-only">Current page is in More</span>}
        </button>}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onNavigate();
          }}
          data-nav-label="Preferences"
          aria-describedby={tooltip.description('Preferences')}
          aria-label="Preferences"
          className={actionClass(false)}
        >
          <Icon name="cog" className="trace-nav-icon w-6 h-6 shrink-0" />
          {showLabels && <span>Preferences</span>}
        </button>
        <button type="button" onClick={onLogout} data-nav-label="Logout" aria-describedby={tooltip.description('Logout')} aria-label="Logout" className={actionClass(true)}>
          <Icon name="logout" className="trace-nav-icon w-6 h-6 shrink-0" />
          {showLabels && <span>Logout</span>}
        </button>
      </div>
      {tooltip.active && <SidebarTooltip id={tooltip.id} label={tooltip.active.label} tooltipRef={tooltip.tooltipRef} tooltipEvents={tooltip.tooltipEvents} />}
    </div>
  );
}
