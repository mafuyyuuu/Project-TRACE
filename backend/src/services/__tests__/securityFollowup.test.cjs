const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const users = require('../../models/user.model');
const documents = require('../../models/document.model');
const grad = require('../../models/gradApplication.model');
const gradService = require('../gradApplication.service');
const { registrationVerification } = require('../../utils/registrationVerification');
const rateModel = require('../../models/rateLimit.model');
const { MysqlRateLimitStore } = require('../rateLimitStore.service');
const { verifiedAccount, loginKey } = require('../../middlewares/rateLimit.middleware');
const api = require('../../app');
const http = require('http');

it('the actual tracking HTTP route requires authentication', async () => {
  const server = http.createServer(api); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { const res = await fetch(`http://127.0.0.1:${server.address().port}/api/documents/TRC-PRIVATE`);
    expect(res.status).toBe(401); expect(res.headers.get('cache-control')).toBe('private, no-store'); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
it('production OCR matches require official-record review', () => {
  expect(registrationVerification({verified:true},{manualReview:true}).verification_status).toBe('pending');
  expect(registrationVerification({verified:true}).verification_status).toBe('verified');
});
it.each(['Finance','Window 1','Receiving Desk','Other'])('denies graduate queue to %s', async desk_assignment => {
  await expect(gradService.listApplications({id:5,role:'clerk',desk_assignment})).rejects.toMatchObject({status:403});
});
it('scopes graduate list queries to the current college and rejects a different-college read', async () => {
  const user = {id:5,role:'clerk',desk_assignment:'Secretary'};
  vi.spyOn(users,'findCourseById').mockResolvedValue([{college_id:2,course:'College Two'}]);
  vi.spyOn(grad,'listApplications').mockResolvedValue([]);
  await gradService.listApplications(user);
  expect(grad.listApplications).toHaveBeenCalledWith({status:undefined,scope:{college_id:2,course:'College Two'}});
  vi.spyOn(grad,'findApplicationById').mockResolvedValue([{id:42,student_id:'STU1',routing_college_id:3}]);
  await expect(gradService.getApplication(user,42)).rejects.toMatchObject({status:403});
});
it('separates persistent rate-limit namespaces without storing login identifiers', async () => {
  vi.spyOn(rateModel,'increment').mockResolvedValue({totalHits:1,resetTime:new Date()}); vi.spyOn(rateModel,'prune').mockResolvedValue([]);
  const login = new MysqlRateLimitStore('login'), api = new MysqlRateLimitStore('api'); login.init({windowMs:1000}); api.init({windowMs:1000});
  await login.increment('private-id'); await api.increment('private-id');
  const keys = rateModel.increment.mock.calls.map(row => row[0]);
  expect(keys.every(key=>/^[a-f0-9]{64}$/.test(key))).toBe(true); expect(keys[0]).not.toBe(keys[1]);
});
it('fails closed with a safe 503 when the counter store is unavailable', async () => {
  vi.spyOn(rateModel,'increment').mockRejectedValue(new Error('private SQL details'));
  const store = new MysqlRateLimitStore('login'); store.init({windowMs:1000});
  await expect(store.increment('test')).rejects.toMatchObject({status:503,message:'Request protection is temporarily unavailable.'});
});
it('uses signed account IDs across IP changes and never trusts unverified JWT claims', () => {
  const token = jwt.sign({id:3,role:'student'},env.JWT_SECRET,{expiresIn:'1h'});
  expect(verifiedAccount({headers:{authorization:`Bearer ${token}`}})).toBe('account:3');
  expect(verifiedAccount({headers:{authorization:`Bearer ${token.slice(0,-8)}tampered`}})).toBeNull();
  expect(loginKey({headers:{},body:{student_id:' abc '}})).toBe(loginKey({headers:{},body:{student_id:'ABC'}}));
});
it('scopes student KPI queries and avoids university-wide OCR/efficiency metrics', async () => {
  vi.spyOn(documents,'scopedStatusCounts').mockResolvedValue([{current_status:'PENDING_W1_INTAKE',count:2,updated_today:1}]);
  vi.spyOn(documents,'avgProcessingMinutes');
  const result = await require('../documents.service').getStats({id:3,role:'student'});
  expect(documents.scopedStatusCounts).toHaveBeenCalledWith(['student.id = ?'],[3]);
  expect(result.avg_processing_minutes).toBeNull(); expect(documents.avgProcessingMinutes).not.toHaveBeenCalled();
});
it('locks a graduate record and rolls back a changed college before review', async () => {
  const tx={beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
  vi.spyOn(pool,'getConnection').mockResolvedValue(tx);
  vi.spyOn(grad,'findApplicationById').mockResolvedValue([{id:42,student_id:'STU1',routing_college_id:3}]);
  vi.spyOn(users,'findCourseById').mockResolvedValue([{college_id:2}]); vi.spyOn(grad,'updateApplicationStatus');
  await expect(gradService.reviewApplication({id:5,role:'clerk',desk_assignment:'Secretary'},42,{status:'approved'})).rejects.toMatchObject({status:403});
  expect(grad.findApplicationById).toHaveBeenCalledWith(42,tx,true); expect(tx.rollback).toHaveBeenCalled(); expect(tx.commit).not.toHaveBeenCalled(); expect(grad.updateApplicationStatus).not.toHaveBeenCalled();
});
