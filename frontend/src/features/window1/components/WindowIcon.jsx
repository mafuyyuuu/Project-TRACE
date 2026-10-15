const REUSED = {"de9d8": "/student-figma/messages-de9d8.svg", "14716": "/student-figma/settings-14716.svg", "95946": "/student-figma/logout-95946.svg", "9e955": "/student-figma/refresh-9e955.svg", "c20b8": "/student-figma/file-c20b8.svg"};
const NAMES = { calendar: '45867', scan: 'a8760', clock: '9e4e6', completed: 'a9775', upload: 'af380', plus: 'bc390', wait: '6db68', check: '0ccfb', refresh: '9e955', document: 'c20b8', close: '3b947', user: '94682', file: '246da', send: 'b740a', search: '2591f', minus: '9ddb1', add: 'defc1', desk: 'c4674', staff: '8d14c', summary: 'a5420', info: '4b3f8', clip: '09c46', undo: '14ee8', arrow: '1ecd8', shield: '27058', link: 'ebf27', chat: '1418b', external: '44bc3', download: '4bd77', release: '9ac44' };
export default function WindowIcon({ name, className = '' }) {
  const key = NAMES[name] || name;
  return <img src={REUSED[key] || `/window-figma/${key}.svg`} alt="" aria-hidden="true" className={`trace-window-icon ${className}`} />;
}
