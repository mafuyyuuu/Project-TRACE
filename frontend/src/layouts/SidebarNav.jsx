import { Link } from 'react-router-dom';
import { navItemsForUser } from '@/utils/navigation';

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
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {ICONS[name]}
    </svg>
  );
}

export default function SidebarNav({
  user,
  tab,
  showLabels = false,
  onNavigate = () => {},
  onOpenSettings,
  onLogout,
}) {
  const items = navItemsForUser(user);

  const linkClass = (isActive) =>
    showLabels
      ? `flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
          isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        }`
      : `w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          isActive ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
        }`;

  const actionClass = (danger) =>
    showLabels
      ? `flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 transition-colors ${
          danger ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-gray-50 hover:text-gray-800'
        }`
      : `w-12 h-12 rounded-full flex items-center justify-center text-gray-400 transition-colors ${
          danger ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-gray-50 hover:text-gray-600'
        }`;

  return (
    <>
      <nav className={showLabels ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
        {items.map((item) => (
          <Link
            key={item.tab}
            to={item.to}
            onClick={onNavigate}
            title={item.label}
            className={linkClass(tab === item.tab)}
          >
            <Icon name={item.icon} className="w-6 h-6 shrink-0" />
            {showLabels && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={showLabels ? 'flex flex-col gap-2 mt-6 pt-6 border-t border-gray-100' : 'flex flex-col gap-4'}>
        <button
          onClick={() => {
            onOpenSettings();
            onNavigate();
          }}
          title="Settings"
          className={actionClass(false)}
        >
          <Icon name="cog" className="w-6 h-6 shrink-0" />
          {showLabels && <span>Settings</span>}
        </button>
        <button onClick={onLogout} title="Logout" className={actionClass(true)}>
          <Icon name="logout" className="w-6 h-6 shrink-0" />
          {showLabels && <span>Logout</span>}
        </button>
      </div>
    </>
  );
}
