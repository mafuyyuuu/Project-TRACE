import { useEffect, useId, useState } from 'react';
import useAuthedFile from '@/hooks/useAuthedFile';
import ImagePreview from '@/components/ImagePreview';
import { formatFileSize } from '@/utils/formatters';

/** Local drafts upload only through the parent form's confirmed Save/Submit. */
export default function FileUploadField({ label = 'Attachment', file, path, onChange, onError, validationError = '', accept = 'image/*,application/pdf', maxBytes = 10 * 1024 * 1024, disabled = false, inputRef, id, allowReplace = true, pickerOnly = false, showLabel = true, compactPreview = false, showDraftStatus = true, pickerIcon }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [local, setLocal] = useState({ file: null, url: null });
  const [error, setError] = useState('');
  const stored = useAuthedFile(pickerOnly || file ? null : path);
  const problem = validationError || error || stored.error;
  const errorProps = { 'aria-invalid': Boolean(problem), 'aria-describedby': problem ? `${inputId}-error` : undefined };
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
    const errorMessage = !allowed ? 'Choose a supported image or PDF file.' : picked.size > maxBytes ? `File exceeds the ${formatFileSize(maxBytes)} limit.` : '';
    if (errorMessage) {
      if (onError) { setError(''); onError(errorMessage); }
      else setError(errorMessage);
      return;
    }
    setError(''); onChange?.(picked);
  };
  // The avatar camera supplies the visible trigger and preview for this mode.
  if (pickerOnly) return <>
    {allowReplace && onChange && <input {...errorProps} id={inputId} ref={inputRef} type="file" aria-label={label} hidden accept={accept} disabled={disabled} onChange={select} />}
    {file && showDraftStatus && <p role="status" className="mb-3 text-sm break-words">New picture selected. Save Profile to upload it.</p>}
    {problem && <p id={`${inputId}-error`} role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">{problem}</p>}
  </>;
  return <section className={`min-w-0 space-y-2 rounded-xl border p-3 ${problem ? 'border-red-600 dark:border-red-400' : 'border-gray-200 dark:border-gray-700'}`} aria-label={label}>
    {allowReplace && onChange ? <div className="min-w-0">
      {showLabel && <label htmlFor={inputId} className="trace-label mb-2">{label}</label>}
      <div className="trace-file-picker">
        {pickerIcon}
        <input {...errorProps} id={inputId} ref={inputRef} type="file" aria-label={label} accept={accept} disabled={disabled} onChange={select} className="peer sr-only" />
        <label htmlFor={inputId} className="trace-file-trigger">{filename ? 'Replace file' : 'Choose file'}</label>
        <span aria-hidden="true" className="min-w-0 break-all text-sm text-gray-700 dark:text-gray-200">{filename || 'No file chosen'}</span>
      </div>
    </div> : <h4 className="text-xs font-bold">{label}</h4>}
    {filename && <p className="text-xs break-all select-text" role="status">{file ? 'Selected: ' : 'Uploaded: '}{filename}{file && ` (${formatFileSize(file.size)})`}</p>}
    {file && <p className="text-xs text-gray-500 dark:text-gray-400">{allowReplace ? 'Selected locally. Save or submit the form to upload; select another file to replace this draft.' : 'Selected locally. Uploaded only after you confirm.'}</p>}
    {url && (pdf ? <iframe src={url} title={`${label} preview`} className="w-full h-48 rounded-lg" /> : <ImagePreview url={url} alt={`${label} preview`} wrapperClassName={compactPreview ? "w-20" : "w-full"} className={compactPreview ? "h-20 w-20 object-contain rounded-lg" : "w-full max-h-48 object-contain rounded-lg"} />)}
    {!file && url && <a href={url} download={filename} className="inline-block text-xs font-bold text-green-700 dark:text-green-300 underline">Download uploaded file</a>}
    {problem && <p id={`${inputId}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300">{problem}</p>}
    {!file && stored.loading && <p role="status" className="text-xs">Loading uploaded file…</p>}
  </section>;
}
