import { beforeEach, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { getDocumentTypes } from '@/services/referenceService';

vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

it.each([
  { document_types: [] },
  { document_types: [{ id: 1, name: 'Certificate of Enrollment', base_fee: '50.00' }] },
])(
  'preserves the document catalog wrapper and its fee fields (%j)', async data => {
    api.get.mockResolvedValue({ data });
    expect(await getDocumentTypes()).toBe(data);
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/reference/document-types');
  },
);

it.each([
  null,
  {},
  [{ name: 'Diploma' }],
  { document_types: {} },
  { document_types: [null] },
  { document_types: [{}] },
  { document_types: [{ name: 12 }] },
  { document_types: [{ name: ' ' }] },
])('rejects unusable document catalog responses (%j)', async data => {
  api.get.mockResolvedValue({ data });
  await expect(getDocumentTypes()).rejects.toThrow('Invalid document catalog response.');
});
