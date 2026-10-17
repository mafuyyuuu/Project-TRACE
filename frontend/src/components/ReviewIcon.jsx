import assets from './reviewAssets.json';

/** Original Figma exports; wrapper layout never changes their root dimensions. */
export default function ReviewIcon({ name }) {
  const asset = assets[name];
  if (!asset) return null;
  return <img src={asset.src} width={asset.width} height={asset.height} alt="" aria-hidden="true" className="shrink-0" />;
}
