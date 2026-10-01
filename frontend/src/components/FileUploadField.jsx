import { useEffect, useId, useState } from 'react';
import useAuthedFile from '@/hooks/useAuthedFile';
import { formatFileSize } from '@/utils/formatters';

/** Local drafts upload only through the parent form's confirmed Save/Submit. */
export default function FileUploadField({ label = 'Attachment', file, path, onChange, accept = 'image/*,application/pdf', maxBytes = 10 * 1024 * 1024, disabled = false, inputRef, id, allowReplace = true, pickerOnly = false }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [local, setLocal] = useState({ file: null, url: null });
  const [error, setError] = useState('');
  const stored = useAuthedFile(pickerOnly || file ? null : path);
  useEffect(() => {
    if (pickerOnly || !(file instanceof Blob)) return undefined;
    const url = URL.createObjectURL(file);
    // Object URLs are external resources with explicit cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file, pickerOnly]);
  const url = file ? local.file === file ? local.url : null : stored.url;
  const filename = file?.name || String(path || '').split(/[\\/]/).pop();
  const pdf = file?.type === 'application/pdf' || /\.pdf$/i.test(filename || '');
  const select = event => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const inferredType = picked.type || ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' }[picked.name.split('.').pop()?.toLowerCase()] || '');
    const allowed = accept.split(',').map(type => type.trim()).some(type => type.startsWith('.') ? picked.name.toLowerCase().endsWith(type) : type.endsWith('/*') ? inferredType.startsWith(type.slice(0, -1)) : inferredType === type);
    if (!allowed) { setError('Choose a supported image or PDF file.'); return; }
    if (picked.size > maxBytes) { setError(`File exceeds the ${formatFileSize(maxBytes)} limit.`); return; }
    setError(''); onChange?.(picked);
  };
  // The avatar camera supplies the visible trigger and preview for this mode.
  if (pickerOnly) return <>
    {allowReplace && onChange && <input id={inputId} ref={inputRef} type="file" aria-label={label} hidden accept={accept} disabled={disabled} onChange={select} />}
    {file && <p role="status" className="mb-3 text-sm break-words">New picture selected. Save Profile to upload it.</p>}
    {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </>;
  return <section className="min-w-0 space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3" aria-label={label}>
    {allowReplace && onChange ? <label htmlFor={inputId} className="block text-xs font-bold">{label}
      <input id={inputId} ref={inputRef} type="file" accept={accept} disabled={disabled} onChange={select} className="block w-full mt-2 text-sm file:mr-2 file:px-3 file:py-2 file:rounded-xl file:border-0 file:bg-green-50 file:text-green-800 disabled:opacity-50" />
    </label> : <h4 className="text-xs font-bold">{label}</h4>}
    {filename && <p className="text-xs break-all select-text" role="status">{file ? 'Selected: ' : 'Uploaded: '}{filename}{file && ` (${formatFileSize(file.size)})`}</p>}
    {file && <p className="text-xs text-gray-500 dark:text-gray-400">Selected locally. Save or submit the form to upload; select another file to replace this draft.</p>}
    {url && (pdf ? <iframe src={url} title={`${label} preview`} className="w-full h-48 rounded-lg" /> : <img src={url} alt={`${label} preview`} className="w-full max-h-48 object-contain rounded-lg" />)}
    {!file && url && <a href={url} download={filename} className="inline-block text-xs font-bold text-green-700 dark:text-green-300 underline">Download uploaded file</a>}
    {(error || stored.error) && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error || stored.error}</p>}
    {!file && stored.loading && <p role="status" className="text-xs">Loading uploaded file…</p>}
  </section>;
}
