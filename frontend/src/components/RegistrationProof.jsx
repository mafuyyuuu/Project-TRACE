import { useEffect, useRef, useState } from 'react';
import AdminIcon from '@/features/admin/components/AdminIcon';
import Button from '@/components/Button';
import ImageViewerModal from '@/components/ImageViewerModal';
import useAuthedFile, { toFilename } from '@/hooks/useAuthedFile';

/** Saved identity evidence is read-only and always fetched with authentication. */
export default function RegistrationProof({ path, label = 'Registration Identity Proof', onPreview, compact = false, review = false }) {
  const filename = toFilename(path);
  const { url, loading, error } = useAuthedFile(filename);
  const [previewPath, setPreviewPath] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const imageRef = useRef(null);
  useEffect(() => {
    if (imageRef.current) imageRef.current.style.transform = `scale(${zoom / 100}) rotate(${rotation}deg)`;
  }, [zoom, rotation, url]);
  const isPdf = /\.pdf$/i.test(filename);
  const preview = () => onPreview ? onPreview(filename) : setPreviewPath(filename);
  if (review) return <section aria-label={label} className="trace-admin-proof">
    <header className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-4"><div><h4 className="font-semibold">ID Proof</h4><p className="trace-admin-caption">Uploaded student ID image</p></div><span className="trace-admin-badge trace-admin-badge-blue"><AdminIcon name="review-id" />Student ID</span></header>
    <div className="trace-admin-proof-preview">
      {loading && <p role="status">Loading uploaded file…</p>}
      {error && <p role="alert" className="trace-inline-error">{error}</p>}
      {!filename && <p>No registration proof uploaded.</p>}
      {url && (isPdf ? <Button type="button" className="trace-button trace-button-secondary" onClick={preview}>Open PDF proof</Button> : <div className="flex min-h-[333px] w-full items-center justify-center overflow-auto"><img ref={imageRef} src={url} alt={`${label} preview`} className="h-[333px] w-[250px] max-w-full shrink-0 rounded-lg border-[3px] border-white object-contain shadow-lg" /></div>)}
      {url && <div className="trace-admin-proof-tools" aria-label="Proof viewer controls">
        <Button type="button" className="trace-icon-button" aria-label="Zoom out proof" disabled={isPdf || zoom <= 50} onClick={() => setZoom(value => Math.max(50, value - 25))}><AdminIcon name="review-zout" /></Button><output aria-label="Proof zoom">{zoom}%</output>
        <Button type="button" className="trace-icon-button" aria-label="Zoom in proof" disabled={isPdf || zoom >= 200} onClick={() => setZoom(value => Math.min(200, value + 25))}><AdminIcon name="review-zin" /></Button>
        <span className="h-[18px] w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
        <Button type="button" className="trace-icon-button" aria-label="Rotate proof" disabled={isPdf} onClick={() => setRotation(value => (value + 90) % 360)}><AdminIcon name="review-rot" /></Button>
        <Button type="button" className="trace-icon-button" aria-label={`Preview ${label}`} onClick={preview}><AdminIcon name="review-max" /></Button>
      </div>}
    </div>
    <footer className="space-y-3 px-[18px] pb-[18px] pt-3.5">
      {filename && <p className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-300"><AdminIcon name="review-clip" /><span className="select-text break-all">{filename}</span></p>}
      {url && <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"><Button type="button" className="trace-button trace-admin-button-soft" onClick={preview}><AdminIcon name="review-max1" />Open full preview</Button><a className="trace-button trace-button-secondary" href={url} download={filename}><AdminIcon name="review-dl" />Download proof</a></div>}
    </footer>
    <ImageViewerModal admin viewImageUrl={previewPath === filename ? previewPath : null} setViewImageUrl={setPreviewPath} />
  </section>;
  if (compact) return <section aria-label={label} className="trace-admin-profile-card bg-gray-50/60 dark:bg-gray-800/50">
    <h4 className="trace-admin-security-heading trace-section-title"><AdminIcon name="student-file-image" />{label}</h4>
    {loading && <p role="status" className="mt-4 text-sm">Loading uploaded file…</p>}
    {error && <p role="alert" className="trace-inline-error mt-4">{error}</p>}
    {!filename && <p className="trace-admin-caption mt-4">No registration proof uploaded.</p>}
    {filename && <div className="mt-5 flex min-w-0 flex-wrap items-start gap-5">
      {url && <Button type="button" motion="feedback" aria-label={`Preview ${label}`} className="trace-action block w-[136px] shrink-0 overflow-hidden rounded-md border border-gray-200" onClick={() => onPreview ? onPreview(filename) : setPreviewPath(filename)}>
        {isPdf ? <span className="flex h-48 items-center justify-center bg-gray-100 text-sm">PDF document</span> : <img src={url} alt={`${label} preview`} className="max-h-52 w-full object-contain" />}
      </Button>}
      <div className="min-w-0 flex-1 space-y-3"><p className="trace-admin-caption">Uploaded</p><p className="select-text break-all text-xs">{filename}</p>{url && <><Button type="button" className="trace-button trace-button-secondary" onClick={() => onPreview ? onPreview(filename) : setPreviewPath(filename)}><AdminIcon name="student-zoom-in" />Preview</Button><a href={url} download={filename} className="trace-button trace-button-secondary"><AdminIcon name="student-download" />Download proof</a></>}</div>
    </div>}
    <ImageViewerModal admin viewImageUrl={previewPath === filename ? previewPath : null} setViewImageUrl={setPreviewPath} />
  </section>;
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
