import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import RequestAssignmentModal from '@/features/admin/components/RequestAssignmentModal';
import { getRequestAssignment, reassignRequest, reconcileRequestCollege } from '@/services/documentsService';
vi.mock('@/services/documentsService',()=>({getRequestAssignment:vi.fn(),reassignRequest:vi.fn(),reconcileRequestCollege:vi.fn()}));
const doc={id:9,current_status:'SEC_PROCESSING',assigned_clerk_id:2,assigned_staff_name:'Synthetic Processor',routing_college_name:'Synthetic College'};
const saved=vi.fn();
beforeEach(()=>{vi.clearAllMocks();getRequestAssignment.mockResolvedValue({document:doc,desk:'Secretary',colleges:[],staff:[{id:3,full_name:'Synthetic Backup'}]});reassignRequest.mockResolvedValue({message:'Assigned'});});
async function stage(){
  render(<RequestAssignmentModal document={doc} onClose={vi.fn()} onSaved={saved}/>);
  await screen.findByRole('option',{name:'Synthetic Backup'});
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'3'}});
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Processor on leave.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review assignment'}));
  return screen.getByRole('dialog',{name:'Confirm Staff Assignment'});
}
it('stages a snapshot, keeps the draft on cancel and saves only on confirmation',async()=>{
  const confirmation=await stage();expect(reassignRequest).not.toHaveBeenCalled();
  fireEvent.click(within(confirmation).getByRole('button',{name:'Cancel'}));
  expect(screen.getByLabelText('Reason')).toHaveValue('Processor on leave.');
  fireEvent.click(screen.getByRole('button',{name:'Review assignment'}));
  fireEvent.click(within(screen.getByRole('dialog',{name:'Confirm Staff Assignment'})).getByRole('button',{name:'Assign staff'}));
  await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  expect(reassignRequest).toHaveBeenCalledWith(9,{staff_id:3,reason:'Processor on leave.',expected_staff_id:2,expected_status:'SEC_PROCESSING'});
});
it('guards repeated confirmation and retains server errors in the confirmation',async()=>{
  let reject;reassignRequest.mockReturnValue(new Promise((_,fail)=>{reject=fail;}));
  const confirmation=await stage(),button=within(confirmation).getByRole('button',{name:'Assign staff'});
  fireEvent.click(button);fireEvent.click(button);
  expect(reassignRequest).toHaveBeenCalledOnce();
  await act(async()=>reject({response:{data:{error:'The assignment changed. Refresh before reassigning.'}}}));
  expect(within(confirmation).getByRole('alert')).toHaveTextContent('The assignment changed.');
  expect(saved).not.toHaveBeenCalled();
});

it('confirms an evidence-based legacy college correction before saving the profile',async()=>{
  const legacy={...doc,student_id:'SYN-003',routing_college_name:null};
  getRequestAssignment.mockResolvedValue({document:legacy,desk:'Secretary',staff:[],can_reconcile_college:true,profile_college_id:null,colleges:[{id:3,name:'Synthetic Former College'}]});
  reconcileRequestCollege.mockResolvedValue({message:'Reconciled'});
  render(<RequestAssignmentModal document={legacy} onClose={vi.fn()} onSaved={saved}/>);
  await screen.findByText('Reconcile current / former college');
  fireEvent.click(screen.getByText('Reconcile current / former college'));
  fireEvent.change(screen.getByLabelText('Verified college'),{target:{value:'3'}});
  fireEvent.change(screen.getByLabelText('Evidence and reason'),{target:{value:'Verified alumni register.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review college correction'}));
  expect(reconcileRequestCollege).not.toHaveBeenCalled();
  const confirmation=screen.getByRole('dialog',{name:'Confirm College Reconciliation'});
  fireEvent.click(within(confirmation).getByRole('button',{name:'Save college'}));
  await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  expect(reconcileRequestCollege).toHaveBeenCalledWith(9,{college_id:3,expected_college_id:null,reason:'Verified alumni register.'});
});
