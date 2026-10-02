import { afterEach, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { extractSignupId } from '@/services/authService';

const originalAdapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = originalAdapter; });

it('sends the chosen ID as a multipart file through the real Axios transformations', async () => {
  const file = new File(['synthetic image'], 'synthetic-id.png', { type: 'image/png' });
  const controller = new AbortController();
  const adapter = vi.fn(async config => {
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.data.get('id_proof')).toBe(file);
    expect(config.headers.get('Content-Type')).toBe('multipart/form-data');
    expect(config.signal).toBe(controller.signal);
    return { data: { full_name: 'Synthetic Student' }, status: 200, headers: {}, config };
  });
  api.defaults.adapter = adapter;
  await expect(extractSignupId(file, { signal: controller.signal })).resolves.toEqual({ full_name: 'Synthetic Student' });
  expect(adapter).toHaveBeenCalledOnce();
});
