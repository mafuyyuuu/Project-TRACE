const service=require('../extremeCases.service'),model=require('../../models/report.model');
beforeEach(()=>{vi.spyOn(model,'activeDelayCases').mockResolvedValue([]);vi.spyOn(model,'deskWaitBaselines').mockResolvedValue([]);});
it.each(['student','clerk'])('denies %s before querying case details',async role=>{await expect(service.snapshot({role})).rejects.toMatchObject({status:403});expect(model.activeDelayCases).not.toHaveBeenCalled();});
it('never shows incomplete case totals as a complete snapshot',async()=>{model.activeDelayCases.mockResolvedValue(Array(5001).fill({}));await expect(service.snapshot({role:'admin'})).resolves.toMatchObject({status:'unavailable'});});
it('keeps report failures distinct from an empty measured population',async()=>{model.activeDelayCases.mockRejectedValue(new Error('Private SQL'));vi.spyOn(console,'warn').mockImplementation(()=>{});await expect(service.snapshot({role:'admin'})).resolves.toMatchObject({status:'unavailable'});});
