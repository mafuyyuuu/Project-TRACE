const fs = require('fs/promises');
const auth = require('../../services/auth.service');
const controller = require('../auth.controller');
const programModel = require('../../models/program.model');
const referenceModel = require('../../models/referenceData.model');

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
it('removes the new uploaded draft when registration validation fails', async () => {
  vi.spyOn(auth, 'register').mockRejectedValue(Object.assign(new Error('Acknowledge the notice'), { status: 400 }));
  vi.spyOn(fs, 'unlink').mockResolvedValue();
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await controller.register({ body: {}, file: { path: '/synthetic/new-proof.png' } }, res);
  expect(fs.unlink).toHaveBeenCalledExactlyOnceWith('/synthetic/new-proof.png');
  expect(res.status).toHaveBeenCalledWith(400);
});
it('retains the accepted proof after registration succeeds', async () => {
  vi.spyOn(auth, 'register').mockResolvedValue({ message: 'Received' });
  vi.spyOn(fs, 'unlink').mockResolvedValue();
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await controller.register({ body: {}, file: { path: '/synthetic/accepted-proof.png' } }, res);
  expect(fs.unlink).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(201);
});
it('preserves proof on an uncertain server failure instead of deleting potentially committed account evidence', async () => {
  vi.spyOn(auth, 'register').mockRejectedValue(new Error('connection lost during commit'));
  vi.spyOn(fs, 'unlink').mockResolvedValue();
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await controller.register({ body: {}, file: { path: '/synthetic/uncertain-proof.png' } }, res);
  expect(fs.unlink).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(500);
});
function referenceRoute(path) {
  const route = require('../../routes/referenceData.routes').stack.find(layer => layer.route?.path === path).route;
  return new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
    route.dispatch({ method: 'GET', headers: {}, query: { includeInactive: 'true' } }, res, reject);
  });
}
it('serves only the active public program catalog before login', async () => {
  vi.spyOn(programModel, 'list').mockResolvedValue([{ id: 1, college_id: 2, name: 'BS Information Technology' }]);
  const result = await referenceRoute('/programs');
  expect(result.status).toBe(200);
  expect(result.body.programs[0].name).toBe('BS Information Technology');
  expect(programModel.list).toHaveBeenCalledExactlyOnceWith();
});
it('keeps the college catalog public without allowing anonymous inactive reads', async () => {
  vi.spyOn(referenceModel, 'listColleges').mockResolvedValue([]);
  expect((await referenceRoute('/colleges')).status).toBe(200);
  expect(referenceModel.listColleges).toHaveBeenCalledWith({ includeInactive: false });
});
it.each(['/document-types', '/payment-methods'])('still requires a session for %s', async path => {
  expect((await referenceRoute(path)).status).toBe(401);
});

it('checks registration ID availability publicly with a dedicated limiter and no account payload',async()=>{
  vi.spyOn(auth,'checkRegistrationId').mockResolvedValue({available:false});
  const res={json:vi.fn()};await controller.checkRegistrationId({body:{employee_id:'SYN-1'}},res);
  expect(res.json).toHaveBeenCalledExactlyOnceWith({available:false});
  const route=require('../../routes/auth.routes').stack.find(layer=>layer.route?.path==='/registration-id-check').route;
  expect(route.methods.post).toBe(true);
  expect(route.stack.map(layer=>layer.handle)).toEqual([require('../../middlewares/rateLimit.middleware').registrationIdLimiter,controller.checkRegistrationId]);
});
