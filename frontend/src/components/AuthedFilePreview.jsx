import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';

/**
 * Renders a protected upload (receipt, scanned form, ID proof), picking an
 * <iframe> for PDFs and an <img> for everything else.
 *
 * Uploads require authentication, so the bytes are fetched with the caller's
 * token and rendered from a blob URL — see useAuthedFile.
 */
export default function AuthedFilePreview({
  path,
  alt = 'Document',
  className = '',
  iframeTitle = 'Document preview',
  onClick,
  wrapperClassName = '',
}) {
  const { url, loading, error } = useAuthedFile(path);
  const isPdf = toFilename(path).toLowerCase().endsWith('.pdf');

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center px-4">
        <span className="text-xs font-semibold text-gray-400">{error || 'No file available'}</span>
      </div>
    );
  }

  if (isPdf) {
    return <iframe src={url} className={className} title={iframeTitle} />;
  }

  const image = <img src={url} alt={alt} className={className} />;

  if (!onClick) return image;

  return (
    <div onClick={onClick} className={wrapperClassName}>
      {image}
    </div>
  );
}
