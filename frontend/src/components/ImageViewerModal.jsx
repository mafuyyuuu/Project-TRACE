import ModalShell from '@/components/ModalShell';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';

export default function ImageViewerModal({ viewImageUrl, setViewImageUrl }) {
  const filename = toFilename(viewImageUrl);
  const { url, loading, error } = useAuthedFile(filename);
  if (!viewImageUrl) return null;

  const isPdf = /\.pdf$/i.test(filename);

  return (
    <ModalShell
      open={!!viewImageUrl}
      onClose={() => setViewImageUrl(null)}
      title="Document preview"
      maxWidth="max-w-5xl"
      bodyClassName="trace-modal-body flex items-center justify-center bg-gray-50 dark:bg-gray-800"
      footer={url && <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 flex-1 basis-48 break-all text-sm text-gray-600 dark:text-gray-300">{filename}</span>
        <a href={url} download={filename} className="trace-button trace-button-secondary trace-button-feedback">Download file</a>
      </div>}
    >
      {loading && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Loading document…</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {url && (isPdf ? <iframe src={url} title="PDF Viewer" className="h-[65dvh] w-full rounded-lg bg-white dark:bg-gray-900" />
        : <img src={url} alt="Full Screen Viewer" className="h-[65dvh] w-full object-contain" />)}
    </ModalShell>
  );
}
