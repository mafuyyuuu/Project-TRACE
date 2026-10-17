const { EventEmitter } = require('node:events');
const realtime = require('../../realtime');
const emit = vi.spyOn(realtime, 'invalidateData');
delete require.cache[require.resolve('../dataChanges.middleware')];
const { dataChanges, changedResources } = require('../dataChanges.middleware');

it.each([
  ['/api/documents/17/intake','POST',['documents','receipts']],
  ['/api/auth/student/3/study-years','PUT',['profile','accounts','documents']],
  ['/api/maintenance/programs/2','PATCH',['reference','accounts','documents']],
  ['/api/support/tickets/11/actions','POST',['support']],
  ['/api/grad-applications/2/review','POST',['graduate','profile','accounts']],
  ['/api/documents/scan','POST',[]],
  ['/api/documents/17/preview','POST',[]],
  ['/api/documents','GET',[]],
])('classifies only completed writes (%s %s)',(url,method,expected)=>expect(changedResources(url,method)).toEqual(expected));

it.each([200,201,204,400,403,500])('emits resource names after success only (HTTP %s)',status=>{
  emit.mockClear();
  const response=new EventEmitter(); response.statusCode=status;
  const next=vi.fn();
  dataChanges({originalUrl:'/api/auth/student/3/study-years',method:'PUT',user:{id:7}},response,next);
  expect(next).toHaveBeenCalledOnce(); expect(emit).not.toHaveBeenCalled();
  response.emit('finish');
  if(status<300)expect(emit).toHaveBeenCalledExactlyOnceWith(['profile','accounts','documents'],{actorId:7,targetUserId:3});
  else expect(emit).not.toHaveBeenCalled();
});
