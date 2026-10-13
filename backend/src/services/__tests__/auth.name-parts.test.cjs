const service=require('../auth.service');
const users=require('../../models/user.model');
const programs=require('../program.service');
const {pool}=require('../../config/db');
let connection;
const student={id:3,role:'student',full_name:'Ana Maria Dela Cruz'};
beforeEach(()=>{
 connection={beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
 vi.spyOn(pool,'getConnection').mockResolvedValue(connection);
 vi.spyOn(users,'getProfileById').mockResolvedValue([student]);
 vi.spyOn(programs,'profileFields').mockResolvedValue({});
 vi.spyOn(users,'saveNameParts').mockResolvedValue();
 vi.spyOn(users,'logSecurityEvent').mockResolvedValue();
 vi.spyOn(users,'updateProfile').mockResolvedValue();
});
it('confirms name parts under the profile lock without rewriting the saved full name',async()=>{
 await service.updateProfile(3,{first_name:'Ana',middle_name:'Maria',last_name:'Dela Cruz'});
 expect(users.getProfileById).toHaveBeenCalledWith(3,connection,true);
 expect(users.saveNameParts).toHaveBeenCalledExactlyOnceWith(3,{first_name:'Ana',middle_name:'Maria',last_name:'Dela Cruz'},connection);
 expect(users.logSecurityEvent).toHaveBeenCalledWith(3,'RECEIPT_NAME_CONFIRMED',null,null,connection);
 expect(users.updateProfile).not.toHaveBeenCalled();expect(connection.commit).toHaveBeenCalledOnce();
});
it('rolls back mismatched names and refuses staff name-field writes',async()=>{
 await expect(service.updateProfile(3,{first_name:'Another',last_name:'Person'})).rejects.toThrow('saved Full Name');
 expect(users.saveNameParts).not.toHaveBeenCalled();expect(connection.rollback).toHaveBeenCalledOnce();
 users.getProfileById.mockResolvedValue([{...student,role:'clerk'}]);
 await expect(service.updateProfile(3,{first_name:'Ana',last_name:'Dela Cruz'})).rejects.toMatchObject({status:403});
});
