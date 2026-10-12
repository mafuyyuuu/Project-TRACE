import { useState } from 'react';
import Button from '@/components/Button';
import ImageViewerModal from '@/components/ImageViewerModal';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';

/** Saved identity evidence is read-only and always fetched with authentication. */
export default function RegistrationProof({ path, label = 'Registration Identity Proof', onPreview }) {
  const filename = toFilename(path);
  const { url, loading, error } = useAuthedFile(filename);
  const [previewPath, setPreviewPath] = useState(null);
  const isPdf = /\.pdf$/i.test(filename);
  return <section aria-label={label} className="trace-section min-w-0 self-start space-y-3 p-3 sm:p-4">
    <h4 className="trace-label">{label}</h4>
    {filename && <p role="status" className="text-xs break-all select-text text-gray-600 dark:text-gray-300">Uploaded: {filename}</p>}
    {loading && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Loading uploaded file…</p>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {!filename && <p className="text-sm text-gray-600 dark:text-gray-300">No registration proof uploaded.</p>}
    {url && <>
      <Button type="button" motion="feedback" aria-label={`Preview ${label}`} onClick={() => onPreview ? onPreview(filename) : setPreviewPath(filename)}
        className="trace-action trace-button-feedback group block w-full overflow-hidden rounded-xl border border-gray-200 hover:border-pine-500 dark:border-gray-700 dark:hover:border-green-400">
        <span className="flex aspect-[8/5] max-h-56 w-full items-center justify-center bg-gray-50 dark:bg-gray-800 p-3">
          {isPdf ? <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">PDF document</span>
            : <img src={url} alt={`${label} preview`} className="h-full w-full object-contain" />}
        </span>
        <span className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-pine-700 group-hover:bg-green-50 group-focus-visible:bg-green-50 dark:border-gray-700 dark:bg-gray-900 dark:text-green-300 dark:group-hover:bg-green-950 dark:group-focus-visible:bg-green-950">
          <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="10" cy="10" r="6" /><path strokeLinecap="round" d="m15 15 6 6M10 7v6M7 10h6" /></svg>
          Preview
        </span>
      </Button>
      <div className="flex flex-wrap justify-end border-t border-gray-200 dark:border-gray-700 pt-3">
        <a href={url} download={filename} className="trace-button trace-button-secondary trace-button-feedback">Download proof</a>
      </div>
    </>}
    <ImageViewerModal viewImageUrl={previewPath === filename ? previewPath : null} setViewImageUrl={setPreviewPath} />
  </section>;
}
