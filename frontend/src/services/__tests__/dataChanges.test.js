import { beforeEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import api from '@/services/api';
import { changedResources, publishDataChange, receiveDataChange, subscribeDataChanges } from '@/services/dataChanges';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it.each([
  ['/documents/17/intake','post',['documents','receipts']],
  ['/api/auth/student/3/study-years','put',['profile','accounts','documents']],
  ['/maintenance/programs/2','patch',['reference','accounts','documents']],
  ['/support/tickets/11/actions','post',['support']],
  ['/grad-applications/2/review','post',['graduate','profile','accounts']],
  ['/documents/scan','post',[]],
  ['/documents/17/preview','post',[]],
  ['/documents','get',[]],
])('invalidates saved resources only (%s %s)',(url,method,expected)=>expect(changedResources(url,method)).toEqual(expected));
it('filters cross-tab invalidations and stops delivering after unsubscription',()=>{
  const listener=vi.fn(),unsubscribe=subscribeDataChanges(listener);
  receiveDataChange(['documents','documents','private-data','token']);
  expect(listener).toHaveBeenCalledExactlyOnceWith(['documents']);
  unsubscribe(); publishDataChange(['accounts']);
  expect(listener).toHaveBeenCalledOnce();
});
it('rejects a delayed successful response from another session before exposing its data or invalidating the new account',async()=>{
  sessionStorage.setItem('trace_token','actor-a');
  const listener=vi.fn(),unsubscribe=subscribeDataChanges(listener);
  let accept;
  const adapter=vi.fn(config=>new Promise(resolve=>{accept=()=>resolve({config,data:{private:'actor-a'},status:200,headers:{}});}));
  const request=api.post('/documents/17/intake',{}, {adapter});
  const rejected=expect(request).rejects.toMatchObject({code:'ERR_CANCELED'});
  await waitFor(()=>expect(adapter).toHaveBeenCalledOnce());
  sessionStorage.setItem('trace_token','actor-b'); accept(); await rejected;
  expect(listener).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('trace_token')).toBe('actor-b'); unsubscribe();
});
it('publishes successful saves but leaves failed writes to their caller',async()=>{
  const listener=vi.fn(),unsubscribe=subscribeDataChanges(listener);
  await api.put('/maintenance/programs/2',{}, {adapter:async config=>({config,data:{},status:200,headers:{}})});
  expect(listener).toHaveBeenCalledExactlyOnceWith(['reference','accounts','documents']);
  listener.mockClear();
  await expect(api.post('/documents',{}, {adapter:async config=>{throw Object.assign(new Error('Rejected'),{config,response:{status:400}});}})).rejects.toThrow('Rejected');
  expect(listener).not.toHaveBeenCalled(); unsubscribe();
});
