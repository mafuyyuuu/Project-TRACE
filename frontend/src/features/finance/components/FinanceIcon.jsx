import assets from './financeAssets.json';
import sharedAssets from '@/features/secretary/components/secretaryAssets.json';

/** Unmodified Finance source exports, with identical shared exports reused. */
export default function FinanceIcon({ name, className = '' }) {
  const asset = assets[name] || sharedAssets[name];
  return asset ? <img src={asset.src} width={asset.width} height={asset.height} data-icon-tone={asset.tone} alt="" aria-hidden="true" className={`trace-finance-icon ${className}`} /> : null;
}

export function FinanceHeaderIcon({ name }) {
  return <span className="trace-finance-header-icon"><FinanceIcon name={name} /></span>;
}
