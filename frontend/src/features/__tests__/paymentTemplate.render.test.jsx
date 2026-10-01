import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';
import api from '@/services/api';
import QRCode from 'qrcode';
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('qrcode', () => ({ default: { toString: vi.fn() } }));
const doc = { id: 1, tracking_number: 'TRC-SYNTHETIC', student_id: 'STU-001', student_name: '<img src=x onerror=bad()>', program: 'BS Information Technology', course: 'College Name', document_type: 'TOR', document_sequence_number: 'TOR – Request No. 3', amount: 200 };
beforeEach(() => {
  QRCode.toString.mockResolvedValue('<svg aria-label="Tracking QR"></svg>');
});
it('retains the tracking QR, real program and sequence alongside a safely substituted custom body', async () => {
  api.get.mockResolvedValue({ data: { content: '<p>{{STUDENT_NAME}}</p>', font_family: 'serif', font_size: '12px' } });
  render(<PaymentStubModal selectedDoc={doc} setActiveModal={vi.fn()} />);
  await screen.findByText('TRACE · Order of Payment');
  expect(screen.getByText(/Program\/Course: BS Information Technology/)).toBeInTheDocument();
  expect(screen.getByText('TOR – Request No. 3')).toBeInTheDocument();
  expect(screen.getByText(doc.student_name)).toBeInTheDocument();
  expect(document.body.querySelector('img')).toBeNull();
  await waitFor(() => expect(document.body.querySelector('svg[aria-label="Tracking QR"]')).toBeInTheDocument());
  expect(QRCode.toString).toHaveBeenCalledWith(doc.tracking_number, expect.any(Object));
});
it('keeps the default printable slip usable when template loading fails without using college as program', async () => {
  api.get.mockRejectedValue(new Error('offline'));
  render(<PaymentStubModal selectedDoc={{ ...doc, program: null }} setActiveModal={vi.fn()} />);
  expect(await screen.findByText('ORDER OF PAYMENT')).toBeInTheDocument();
  expect(screen.getByText('Not entered')).toBeInTheDocument();
  expect(screen.queryByText(doc.course)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Print Slip' })).toBeEnabled();
});
