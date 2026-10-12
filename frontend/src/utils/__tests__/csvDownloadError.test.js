import {expect,it} from 'vitest';
import {decodeCsvError} from '@/utils/csvDownloadError';
it('exposes a JSON refusal returned as a CSV-download blob',async()=>{
  const error={response:{data:{text:async()=>JSON.stringify({error:'More than 10,000 documents match. Narrow the filters.'})}}};
  expect(await decodeCsvError(error)).toBe(error);
  expect(error.response.data.error).toContain('Narrow');
});
it('preserves generic feedback for a non-JSON download error',async()=>{
  const body={text:async()=>'<html>gateway unavailable</html>'},error={response:{data:body}};
  await decodeCsvError(error);expect(error.response.data).toBe(body);
});
