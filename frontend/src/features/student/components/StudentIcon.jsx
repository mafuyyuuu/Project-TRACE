import { assetIconTone } from '@/utils/assetIconTone';
/** Original Student frame exports retain their intrinsic dimensions. */
export default function StudentIcon({ name, className = '' }) {
  const src = `/student-figma/${name}.svg`;
  return <img src={src} data-icon-tone={assetIconTone(src)} alt="" aria-hidden="true" className={`trace-student-icon shrink-0 ${className}`} />;
}
