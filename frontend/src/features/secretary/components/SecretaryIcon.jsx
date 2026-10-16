import assets from './secretaryAssets.json';

/** Original Figma exports retain their intrinsic SVG dimensions. */
export default function SecretaryIcon({ name, className = '' }) {
  const asset = assets[name];
  if (!asset) return null;
  return <img src={asset.src} width={asset.width} height={asset.height} data-icon-tone={asset.tone} alt="" aria-hidden="true" className={`trace-secretary-icon ${className}`} />;
}

export function SecretaryHeaderIcon({ name }) {
  return <span className="trace-secretary-header-icon"><SecretaryIcon name={name} /></span>;
}
