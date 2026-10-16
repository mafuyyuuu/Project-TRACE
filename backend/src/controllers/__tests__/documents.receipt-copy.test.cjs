const controller=require('../documents.controller');
const service=require('../../services/documents.service');
const fs=require('fs/promises');
const file={path:'/synthetic/test-only-receipt.pdf',filename:'test-only-receipt.pdf'};
let res;
beforeEach(()=>{res={json:vi.fn(),status:vi.fn().mockReturnThis()};vi.spyOn(fs,'unlink').mockResolvedValue();vi.spyOn(console,'error').mockImplementation(()=>{});});
it('preserves a committed upload and discards the new file on a successful verification retry',async()=>{
 vi.spyOn(service,'verifyPayment').mockResolvedValue({receipt:{copy_path:'/uploads/test-only-receipt.pdf'}});
 const req={user:{},params:{id:1},body:{},file};await controller.verifyPayment(req,res);expect(fs.unlink).not.toHaveBeenCalled();
 service.verifyPayment.mockResolvedValue({receipt:{copy_path:'/uploads/original-copy.pdf'}});await controller.verifyPayment(req,res);
 expect(fs.unlink).toHaveBeenCalledExactlyOnceWith(file.path);
});
it('discards an uncommitted copy after rejected verification',async()=>{
 vi.spyOn(service,'verifyPayment').mockRejectedValue(Object.assign(new Error('Invalid receipt'),{status:400}));
 await controller.verifyPayment({user:{},params:{id:1},body:{},file},res);
 expect(fs.unlink).toHaveBeenCalledExactlyOnceWith(file.path);expect(res.status).toHaveBeenCalledWith(400);
});
