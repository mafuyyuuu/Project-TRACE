import {expect,it} from 'vitest';
import {render,screen,within,fireEvent} from '@testing-library/react';
import AdminAuditLog from '@/features/admin/components/AdminAuditLog';

it.each([
 ['or_verified','Official Receipt (OR) Verified','Official Receipt'],
 ['AI_VERIFIED','Artificial Intelligence (AI) Verified','Artificial Intelligence'],
 ['ocr_reviewed','Optical Character Recognition (OCR) reviewed','Optical Character Recognition'],
 ['legacy_manual_review','Legacy manual review','manual review'],
])('displays and searches human-readable activity labels while retaining saved codes: %s',(code,label,query)=>{
 const log={id:1,step_name:code,document_type:'Synthetic document',tracking_number:'TRC-SYNTHETIC',timestamp_started:'2026-10-16T02:00:00Z',status:'COMPLETED'};
 render(<AdminAuditLog logs={[log]}/>);
 const table=screen.getByRole('table',{name:'System-wide audit log'});
 expect(within(table).getByText(label)).toHaveAttribute('title',code);
 fireEvent.change(screen.getByRole('searchbox',{name:'Search activity logs'}),{target:{value:query}});
 expect(within(table).getByText(label)).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox',{name:'Search activity logs'}),{target:{value:code}});
 expect(within(table).getByText(label)).toBeInTheDocument();
 expect(log.step_name).toBe(code);
});
