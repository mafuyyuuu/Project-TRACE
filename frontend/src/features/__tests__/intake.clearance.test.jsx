import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
const state = vi.hoisted(() => ({rows:[],types:[],loading:true,error:'',readOnly:false,refresh:vi.fn()}));
vi.mock('@/hooks/useRequestAttachments', () => ({default:()=>state}));
const props = {user:{id:2,role:'clerk',desk_assignment:'Window 1'},selectedDoc:{id:9,student_id:'SYN-1',document_type:'Diploma',current_status:'PENDING_W1_INTAKE',assigned_staff_name:'Synthetic Clerk'},
  documentTypes:[{name:'Diploma',requires_attachment:false}],intakeNotes:'',setIntakeNotes:vi.fn(),setActiveModal:vi.fn(),handleIntake:vi.fn(),setIntakeFile:vi.fn()};
beforeEach(() => {Object.assign(state,{rows:[],loading:true,error:''});vi.clearAllMocks();});
it('keeps routing disabled until requirements load, and until flagged clearance is accepted', () => {
  const {rerender}=render(<IntakeReviewModal {...props} />);
  const route=screen.getByRole('button',{name:'Route to Secretary'});
  expect(route).toBeDisabled();
  state.loading=false;state.rows=[{id:4,label:'Exit clearance',instructions:'Signed institutional clearance.',blocks_intake:1,status:'requested',created_at:'2026-10-10'}];
  rerender(<IntakeReviewModal {...props} />);
  expect(route).toBeDisabled();
  expect(screen.getByText(/Routing is awaiting clearance review/)).toBeInTheDocument();
  state.rows=[{...state.rows[0],status:'accepted',reviewed_by_name:'Synthetic Reviewer'}];
  rerender(<IntakeReviewModal {...props} />);
  expect(route).toBeEnabled();
  expect(screen.getByText('Reviewed by Synthetic Reviewer')).toBeInTheDocument();
  fireEvent.click(route);expect(props.handleIntake).toHaveBeenCalledWith('approve');
});
it('does not impose a clearance flag on every student, and fails closed on loading errors', () => {
  state.loading=false;const {rerender}=render(<IntakeReviewModal {...props} />);
  expect(screen.getByRole('button',{name:'Route to Secretary'})).toBeEnabled();
  state.error='Could not load requirements.';rerender(<IntakeReviewModal {...props} />);
  expect(screen.getByRole('button',{name:'Route to Secretary'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Refresh attachments'})).toBeEnabled();
});
