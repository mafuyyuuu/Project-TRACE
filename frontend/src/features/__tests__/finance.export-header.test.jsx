import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FinanceDashboard from '@/features/finance/FinanceDashboard';
import FinanceTransactionsPanel from '@/features/finance/components/FinanceTransactionsPanel';
import * as reports from '@/services/reportsService';
import { EMPTY_FINANCE_FILTERS } from '@/utils/reportFilters';
vi.mock('@/services/reportsService',()=>({
 getReportFilterOptions:vi.fn().mockResolvedValue({colleges:[],document_types:[],college_locked:false}),
 getDocumentReport:vi.fn(),getAnalytics:vi.fn(),exportDocumentsCsv:vi.fn(),exportStudentsCsv:vi.fn()
}));
const user={role:'clerk',desk_assignment:'Finance'};
beforeEach(()=>{
 vi.clearAllMocks();
 reports.getDocumentReport.mockResolvedValue({documents:[],page:1,totalPages:1,total:0,summary:{total:0,completed:0,rejected:0,paid:0,revenue:0}});
 reports.exportDocumentsCsv.mockResolvedValue('synthetic.csv');
});
it.each(['reports','export','exports'])('opens Finance %s in the same reports workspace as other staff',async tab=>{
 render(<FinanceDashboard user={user} currentTab={tab} setViewImageUrl={vi.fn()}/>);
 await screen.findByRole('heading',{name:'Reports & Export'});
 expect(screen.getByLabelText('Student ID / Name')).toBeInTheDocument();expect(screen.getByLabelText('College / Department')).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Payment History'})).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Export CSV',exact:true}));
 expect(within(screen.getByRole('dialog',{name:'Export'})).getByLabelText('Dataset').options).toHaveLength(5);
 expect(reports.getAnalytics).not.toHaveBeenCalled();
});
it('exports only the applied Finance report filters',async()=>{
 render(<FinanceDashboard user={user} currentTab="reports" setViewImageUrl={vi.fn()}/>);
 await screen.findByRole('heading',{name:'Reports & Export'});
 await userEvent.type(screen.getByLabelText('Student ID / Name'),'SYN-001');
 await userEvent.selectOptions(screen.getByLabelText('Payment'),'PAID');
 await userEvent.click(screen.getByRole('button',{name:'Apply Filters'}));
 await waitFor(()=>expect(reports.getDocumentReport).toHaveBeenLastCalledWith(expect.objectContaining({studentSearch:'SYN-001',paymentStatus:'PAID'})));
 await userEvent.click(screen.getByRole('button',{name:'Export CSV',exact:true}));
 await waitFor(()=>expect(within(screen.getByRole('dialog',{name:'Export'})).getByRole('button',{name:'Export CSV'})).toBeEnabled());
 await userEvent.click(within(screen.getByRole('dialog',{name:'Export'})).getByRole('button',{name:'Export CSV'}));
 await waitFor(()=>expect(reports.exportDocumentsCsv).toHaveBeenCalledExactlyOnceWith({studentSearch:'SYN-001',paymentStatus:'PAID'}));
});
it('History has only payment filters, copy actions and a live waiting indicator',async()=>{
 const now=Date.parse('2026-10-12T04:00:00Z');
 render(<FinanceTransactionsPanel state={{
 filters:EMPTY_FINANCE_FILTERS,applyFilters:vi.fn(),refresh:vi.fn(),transactions:[
 {request_group_id:'SYN-1',id:1,student_name:'Synthetic Student',student_id:'SYN-001',or_number:'DEMO00001',amount:100,payment_cleared_at:'2026-10-10T03:00:00Z'},
 {request_group_id:'SYN-2',id:2,student_name:'Second Student',or_number:'DEMO00002',amount:100,official_receipt_path:'/uploads/synthetic.pdf'}
 ],loading:false,total:2,amount:200,now,page:1,setPage:vi.fn()
 }} onUpload={vi.fn()} onProfile={vi.fn()} onViewReceipt={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Apply Filters'})).toBeEnabled());
 expect(screen.getByRole('heading',{name:'Payment History'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Upload OR'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'View OR'})).toBeInTheDocument();
 expect(screen.getByText('2d 1h 0m waiting for OR copy')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Export/})).not.toBeInTheDocument();expect(screen.queryByLabelText('Official Receipt issuance number')).not.toBeInTheDocument();
});
