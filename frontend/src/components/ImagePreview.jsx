import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';

/** Reuse the authenticated/local blob; viewing never uploads or fetches a public copy. */
export default function ImagePreview({ url, alt, className = '', wrapperClassName = '', onOpen }) {
  const [opened,setOpened] = useState(null);
  return <>
    <span className={`trace-image-preview ${wrapperClassName}`}>
      <img src={url} alt={alt} className={className} />
      <Button type="button" aria-label={`${onOpen ? 'Open' : 'View'} ${alt}`} onClick={() => onOpen ? onOpen() : setOpened(url)} motion="feedback" className="trace-image-preview-button trace-button">View image</Button>
    </span>
    <ModalShell open={Boolean(url && opened === url)} onClose={() => setOpened(null)} title="Image preview" subtitle={alt} maxWidth="max-w-5xl" bodyClassName="trace-modal-body flex min-h-0 items-center justify-center overflow-auto">
      <img src={url} alt={`Enlarged ${alt}`} className="max-h-[65dvh] max-w-full object-contain" />
    </ModalShell>
  </>;
}
