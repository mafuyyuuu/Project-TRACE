import {expect,it} from 'vitest';
import {windowTrackingMatches} from '@/utils/windowPresentation';
import {PIPELINE} from '@/utils/documentStatus';
it('partitions every loaded document exactly once without pretending legacy records are active',()=>{
 const documents=[...PIPELINE,'REJECTED','APPROVED','cancelled','UNKNOWN',null].map(current_status=>({current_status}));
 for(const document of documents)expect(['progress','completed','other'].filter(filter=>windowTrackingMatches(document,filter))).toHaveLength(1);
 expect(documents.filter(doc=>windowTrackingMatches(doc,'all'))).toHaveLength(documents.length);
 expect(windowTrackingMatches({current_status:'REJECTED'},'progress')).toBe(false);
});
