const service=require('../../services/supportTicket.service');
const uploads=require('../../utils/supportUpload');
const controller=require('../supportTicket.controller');
const files=[{filename:'synthetic-private.png'}];
function response(){return {set:vi.fn().mockReturnThis(),status:vi.fn().mockReturnThis(),json:vi.fn().mockReturnThis()};}
beforeEach(()=>{
 vi.spyOn(uploads,'validateFiles').mockResolvedValue();
 vi.spyOn(uploads,'cleanup').mockResolvedValue();
 vi.spyOn(service,'send').mockResolvedValue({sent:{id:1},duplicate:false});
 vi.spyOn(console,'error').mockImplementation(()=>{});
 // The controller destructures the validation helpers at module load.
 delete require.cache[require.resolve('../supportTicket.controller')];
});
async function send(){const res=response(),next=vi.fn();await require('../supportTicket.controller').send({user:{id:1},params:{ticketId:2},body:{message:'Synthetic'},files},res,next);return {res,next};}
it('cleans newly uploaded files on an accepted retry without deleting the persisted message',async()=>{
 service.send.mockResolvedValue({sent:{id:1},duplicate:true});
 const {res}=await send();expect(uploads.cleanup).toHaveBeenCalledWith(files);expect(res.json).toHaveBeenCalledWith({sent:{id:1},duplicate:true});
});
it('cleans files after a failed authorized write and retains the application error',async()=>{
 const error=Object.assign(new Error('Case is closed.'),{status:400});service.send.mockRejectedValue(error);
 const {next}=await send();expect(uploads.cleanup).toHaveBeenCalledWith(files);expect(next).toHaveBeenCalledWith(error);
});
it('rejects invalid content before sending and cleans every temporary upload',async()=>{
 const error=Object.assign(new Error('Invalid image.'),{status:400});uploads.validateFiles.mockRejectedValue(error);
 const {next}=await send();expect(service.send).not.toHaveBeenCalled();expect(uploads.cleanup).toHaveBeenCalledWith(files);expect(next).toHaveBeenCalledWith(error);
});
it('denies unauthorized multipart access before parsing uploaded bytes',async()=>{
 vi.spyOn(service,'assertSendAccess').mockRejectedValue(Object.assign(new Error('Forbidden.'),{status:403}));
 const next=vi.fn();await controller.uploadAccess({user:{id:1},params:{ticketId:2}},response(),next);
 expect(next.mock.calls[0][0].status).toBe(403);expect(uploads.validateFiles).not.toHaveBeenCalled();
});
