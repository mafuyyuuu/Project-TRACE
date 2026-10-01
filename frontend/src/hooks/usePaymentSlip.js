import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getTemplate } from '@/services/templateService';

export default function usePaymentSlip(tracking) {
  const [qr, setQr] = useState(null);
  const [template, setTemplate] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    getTemplate('payment_slip', { signal: controller.signal, timeout: 15000 })
      .then(response => { if (active) setTemplate(response.data); })
      .catch(() => {}); // The printable branded default remains available.
    return () => { active = false; controller.abort(); };
  }, []);
  useEffect(() => {
    if (!tracking) return;
    let active = true;
    QRCode.toString(tracking, { type: 'svg', margin: 0, width: 132 })
      .then(svg => { if (active) setQr({ tracking, svg }); })
      .catch(() => { if (active) setQr({ tracking, svg: '' }); });
    return () => { active = false; };
  }, [tracking]);
  return { template, qrSvg: qr?.tracking === tracking ? qr?.svg || '' : '' };
}
