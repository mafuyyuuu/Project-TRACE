const jwt=require('jsonwebtoken');
const {JWT_SECRET}=require('../../config/env');
const {pool}=require('../../config/db');
const sessions=require('../../models/session.model');
const service=require('../../services/reportPdf.service');
const router=require('../../routes/reports.routes');
beforeEach(()=>{vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(pool,'query').mockResolvedValue([[{is_active:1,token_version:0}]]);vi.spyOn(sessions,'revoked').mockResolvedValue(false);vi.spyOn(service,'generate').mockResolvedValue({filename:'trace-support-report-2026-10-17.pdf',bytes:Buffer.from('%PDF-test')});});
function request(role,url='/export/support.pdf'){
 return new Promise((resolve,reject)=>{
  const token=role?jwt.sign({id:7,role,token_version:0},JWT_SECRET,{expiresIn:'5m'}):null;
  const res={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.statusCode=code;return this;},json(body){resolve({status:this.statusCode,body,headers:this.headers});return this;},send(body){resolve({status:this.statusCode,body,headers:this.headers});return this;}};
  router.handle({method:'GET',url,headers:token?{authorization:`Bearer ${token}`}:{},query:{dateFrom:'2026-10-01'}},res,error=>reject(error||new Error('Route did not respond')));
 });
}
it.each([[null,401],['student',403],['clerk',403]])('denies %s PDF access through the real router',async(role,status)=>{const response=await request(role);expect(response.status).toBe(status);expect(service.generate).not.toHaveBeenCalled();});
it('dispatches a PDF filename route, forwards filters and returns private download headers',async()=>{const response=await request('admin');expect(response.status).toBe(200);expect(service.generate).toHaveBeenCalledWith(expect.objectContaining({role:'admin'}),'support',{dateFrom:'2026-10-01'});expect(response.headers).toMatchObject({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="trace-support-report-2026-10-17.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});expect(Buffer.isBuffer(response.body)).toBe(true);});
it('returns a readable error without emitting a partial PDF',async()=>{service.generate.mockRejectedValue(Object.assign(new Error('Narrow the report period.'),{status:400}));const response=await request('admin');expect(response.status).toBe(400);expect(response.body).toEqual({error:'Narrow the report period.'});expect(response.headers['Content-Type']).toBeUndefined();});
it('does not turn a generation failure into a PDF download',async()=>{service.generate.mockRejectedValue(new Error('Private implementation details'));const response=await request('admin');expect(response.status).toBe(500);expect(response.body.error).not.toContain('Private implementation');});
