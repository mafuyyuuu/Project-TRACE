const tickets=require('../supportTicket.service');
const {startTimers}=require('../supportTimer.service');
afterEach(()=>vi.useRealTimers());
it('runs at startup, prevents overlapping checks and stops on cleanup',async()=>{
 vi.useFakeTimers(); let finish;
 vi.spyOn(tickets,'processTimers').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue();
 const stop=startTimers(); expect(tickets.processTimers).toHaveBeenCalledOnce();
 await vi.advanceTimersByTimeAsync(30000); expect(tickets.processTimers).toHaveBeenCalledOnce();
 finish(); await Promise.resolve(); await vi.advanceTimersByTimeAsync(15000); expect(tickets.processTimers).toHaveBeenCalledTimes(2);
 stop(); await vi.advanceTimersByTimeAsync(30000); expect(tickets.processTimers).toHaveBeenCalledTimes(2);
});
it('logs only a safe failure code once until checks recover',async()=>{
 vi.useFakeTimers(); vi.spyOn(tickets,'processTimers').mockRejectedValue({code:'ER_SYNTHETIC',message:'private contents must not log'});
 vi.spyOn(console,'warn').mockImplementation(()=>{}); const stop=startTimers();
 await vi.advanceTimersByTimeAsync(30000); expect(console.warn).toHaveBeenCalledExactlyOnceWith('Support timer check unavailable:','ER_SYNTHETIC'); stop();
});
