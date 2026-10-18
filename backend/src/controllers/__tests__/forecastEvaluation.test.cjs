const jwt=require('jsonwebtoken');
const {JWT_SECRET}=require('../../config/env');
const {pool}=require('../../config/db');
const sessions=require('../../models/session.model');
const service=require('../../services/forecastEvaluation.service');
const router=require('../../routes/documents.routes');
beforeEach(()=>{vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(pool,'query').mockResolvedValue([[{is_active:1,token_version:0}]]);vi.spyOn(sessions,'revoked').mockResolvedValue(false);vi.spyOn(service,'evaluate').mockResolvedValue({status:'insufficient_data',history_days:14});});
function request(role){return new Promise((resolve,reject)=>{const token=role?jwt.sign({id:7,role,token_version:0},JWT_SECRET,{expiresIn:'5m'}):null;const headers={};const res={statusCode:200,setHeader(key,value){headers[key]=value;},status(code){this.statusCode=code;return this;},json(body){resolve({status:this.statusCode,headers,body});return this;}};router.handle({method:'GET',url:'/stats/forecast/evaluation',headers:token?{authorization:`Bearer ${token}`}:{},query:{documentType:'Diploma'}},res,error=>reject(error||new Error('Route did not respond')));});}
it.each([[null,401],['student',403],['clerk',403]])('denies %s before expensive validation',async(role,status)=>{expect((await request(role)).status).toBe(status);expect(service.evaluate).not.toHaveBeenCalled();});
it('uses the authenticated Admin and exact type with private response caching',async()=>{const result=await request('admin');expect(result.status).toBe(200);expect(result.headers['Cache-Control']).toBe('private, no-store');expect(service.evaluate).toHaveBeenCalledWith(expect.objectContaining({role:'admin'}),{documentType:'Diploma'});});
it('propagates an unavailable-model error instead of returning fabricated metrics',async()=>{service.evaluate.mockRejectedValue(Object.assign(new Error('No score was calculated.'),{status:503}));const result=await request('admin');expect(result.status).toBe(503);expect(result.body.error).toBe('No score was calculated.');expect(result.body).not.toHaveProperty('metrics');});
