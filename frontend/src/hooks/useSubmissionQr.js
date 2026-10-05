import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function useSubmissionQr(applicant) {
  // This is the displayed frontend's origin, never the API or a guessed form URL.
  const url = new URL(`/signup?applicant=${applicant === 'alumni' ? 'alumni' : 'student'}`, window.location.origin).href;
  const [result, setResult] = useState({ url: '', image: '', error: '' });
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 768, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then(image => { if (active) setResult({ url, image, error: '' }); })
      .catch(() => { if (active) setResult({ url, image: '', error: 'QR unavailable. Use the displayed registration link.' }); });
    return () => { active = false; };
  }, [url]);
  return { url, image: result.url === url ? result.image : '', error: result.url === url ? result.error : '', loading: result.url !== url };
}
