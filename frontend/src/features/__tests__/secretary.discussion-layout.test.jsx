import { useState } from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SecretaryEvaluationModal from '@/features/secretary/components/SecretaryEvaluationModal';
vi.mock('@/components/RequestMessagesPanel',()=>({default:({initialDocumentId})=><input aria-label="Synthetic discussion draft" data-document-id={initialDocumentId} defaultValue="" />}));
const evaluate=vi.fn(),close=vi.fn();
function Harness() {
 const [name,setName]=useState('Synthetic Student'),[id,setId]=useState('SYN-3'),[type,setType]=useState('Diploma'),[date,setDate]=useState('2026-10-20'),[notes,setNotes]=useState('');
 return <SecretaryEvaluationModal user={{id:4,role:'clerk',desk_assignment:'Secretary'}} selectedDoc={{id:42,tracking_number:'SYN-42',student_id:'SYN-3',student_name:'Synthetic Student',document_type:'Diploma'}} setActiveModal={close} evalStudentId={id} setEvalStudentId={setId} evalStudentName={name} setEvalStudentName={setName} evalDocType={type} setEvalDocType={setType} estimatedReadyDate={date} setEstimatedReadyDate={setDate} clerkNotes={notes} setClerkNotes={setNotes} handleSecretaryEvaluate={evaluate} documentTypes={[{id:1,name:'Diploma'}]} />;
}
it('separates evaluation and discussion and preserves both drafts while changing the mobile view',()=>{
 render(<Harness />);
 fireEvent.change(screen.getByLabelText('Secretary Notes'),{target:{value:'Retained evaluation draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Open discussion'}));
 fireEvent.change(screen.getByLabelText('Synthetic discussion draft'),{target:{value:'Retained message draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Back to evaluation'}));
 expect(screen.getByLabelText('Secretary Notes')).toHaveValue('Retained evaluation draft');
 fireEvent.click(screen.getByRole('button',{name:'Open discussion'}));
 expect(screen.getByLabelText('Synthetic discussion draft')).toHaveValue('Retained message draft');
 expect(screen.getByLabelText('Synthetic discussion draft')).toHaveAttribute('data-document-id','42');
 expect(screen.getByLabelText('Evaluation fields')).not.toContainElement(screen.getByLabelText('Synthetic discussion draft'));
 fireEvent.click(screen.getByRole('button',{name:'Accept for Processing'}));expect(evaluate).toHaveBeenCalledWith('approve');
});
