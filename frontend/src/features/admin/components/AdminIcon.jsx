const ASSETS = { 'staff-eye': 'staff-eye.png', dashboard: 'home', document: 'document', message: 'messages', wrench: 'tools', checklist: 'checklist', shield: 'security', more: 'apps', cog: 'settings', logout: 'logout', help: 'helpCircle', moon: 'moon', bell: 'bell' };

export default function AdminIcon({ name, className = '', active = false }) {
  const asset = ASSETS[name] || name;
  return <img src={`/admin-figma/${/\.(png|svg)$/.test(asset) ? asset : asset + '.svg'}`} width={asset === 'staff-eye.png' ? 18 : undefined} height={asset === 'staff-eye.png' ? 18 : undefined} alt="" aria-hidden="true" className={`trace-admin-icon ${active ? 'trace-admin-icon-active' : ''} ${className}`} />;
}
