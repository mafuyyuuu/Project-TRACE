import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import axios from 'axios';
import api, { getPendingApiRequests, subscribeApiActivity } from '@/services/api';

function deferredAdapter() {
  let config;
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {
    adapter: vi.fn(value => { config = value; return promise; }),
    respond: () => resolve({ config, data: { ok: true }, status: 200, statusText: 'OK', headers: {} }),
    fail: status => reject(Object.assign(new Error('Request failed'), {
      config, response: status ? { status } : undefined,
    })),
  };
}

beforeEach(() => {
  expect(getPendingApiRequests()).toBe(0);
  localStorage.clear();
});

describe('Shared API loading activity', () => {
  it('keeps activity until concurrent requests finish, including out-of-order completion', async () => {
    const snapshots = [];
    const unsubscribe = subscribeApiActivity(() => snapshots.push(getPendingApiRequests()));
    const first = deferredAdapter();
    const second = deferredAdapter();
    const firstRequest = api.get('/first', { adapter: first.adapter });
    const secondRequest = api.get('/second', { adapter: second.adapter });
    await waitFor(() => expect(getPendingApiRequests()).toBe(2));
    second.respond();
    expect((await secondRequest).data).toEqual({ ok: true });
    expect(getPendingApiRequests()).toBe(1);
    first.respond();
    await firstRequest;
    expect(getPendingApiRequests()).toBe(0);
    expect(snapshots).toEqual([1, 2, 1, 0]);
    unsubscribe();
    const next = deferredAdapter();
    const nextRequest = api.get('/next', { adapter: next.adapter });
    await waitFor(() => expect(next.adapter).toHaveBeenCalledOnce());
    next.respond();
    await nextRequest;
    expect(snapshots).toEqual([1, 2, 1, 0]);
  });

  it.each([undefined, 503])('clears activity after network/HTTP failure (%s)', async status => {
    const pending = deferredAdapter();
    const request = api.get('/failed', { adapter: pending.adapter });
    const rejected = expect(request).rejects.toThrow('Request failed');
    await waitFor(() => expect(getPendingApiRequests()).toBe(1));
    pending.fail(status);
    await rejected;
    expect(getPendingApiRequests()).toBe(0);
  });

  it('clears aborted activity immediately and does not count its late completion twice', async () => {
    const controller = new AbortController();
    const cancelled = deferredAdapter();
    const remaining = deferredAdapter();
    const cancelledRequest = api.get('/cancelled', { signal: controller.signal, adapter: cancelled.adapter });
    const rejected = expect(cancelledRequest).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    const remainingRequest = api.get('/remaining', { adapter: remaining.adapter });
    await waitFor(() => expect(getPendingApiRequests()).toBe(2));
    controller.abort();
    expect(getPendingApiRequests()).toBe(1);
    cancelled.respond();
    await rejected;
    expect(getPendingApiRequests()).toBe(1);
    remaining.respond();
    await remainingRequest;
    expect(getPendingApiRequests()).toBe(0);
  });

  it('does not leave activity behind for an already-aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = vi.fn();
    await expect(api.get('/cancelled', { signal: controller.signal, adapter })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
    expect(getPendingApiRequests()).toBe(0);
  });

  it('handles legacy cancellation whose error has no request config', async () => {
    const source = axios.CancelToken.source();
    const pending = deferredAdapter();
    const request = api.get('/cancelled', { cancelToken: source.token, adapter: pending.adapter });
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await waitFor(() => expect(getPendingApiRequests()).toBe(1));
    source.cancel('Cancelled');
    await waitFor(() => expect(getPendingApiRequests()).toBe(0));
    pending.respond();
    await rejected;
    expect(getPendingApiRequests()).toBe(0);
  });

  it('retains bearer authentication and the OTP 401 exception', async () => {
    localStorage.setItem('trace_token', 'fixture-token');
    localStorage.setItem('trace_user', '{"id":1}');
    const pending = deferredAdapter();
    const request = api.post('/auth/verify-2fa', { otp: '123456' }, { adapter: pending.adapter });
    const rejected = expect(request).rejects.toThrow('Request failed');
    await waitFor(() => expect(pending.adapter).toHaveBeenCalledOnce());
    const config = pending.adapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBe('Bearer fixture-token');
    expect(config.withCredentials).toBe(true);
    expect(JSON.parse(config.data)).toEqual({ otp: '123456' });
    pending.fail(401);
    await rejected;
    expect(localStorage.getItem('trace_token')).toBe('fixture-token');
    expect(localStorage.getItem('trace_user')).toBe('{"id":1}');
    expect(getPendingApiRequests()).toBe(0);
  });
});
