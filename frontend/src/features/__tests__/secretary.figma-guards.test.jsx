import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PricingModal from '@/features/secretary/components/PricingModal';
import ReceiptVerificationModal from '@/features/secretary/components/ReceiptVerificationModal';
import SecretaryHandoffModal from '@/features/secretary/components/SecretaryHandoffModal';
import { calculateBreakdown } from '@/utils/pricing';

vi.mock('@/components/AuthedFilePreview',()=>({default:()=><div>Authorized receipt preview</div>}));
const doc = {id:1,student_name:'Synthetic Student',tracking_number:'TRC-SYNTHETIC',document_type:'Transcript of Records',amount:200,or_number:'SYN-OR-1',copies:2,pricing_schedule:{fee_rule:'per_page',base_fee:50,fee_items:[],rental_fee:0,special_fee:0}};

it('requires inspection of an uploaded OR and resets acknowledgment when its recorded receipt changes',()=>{
  const confirm=vi.fn(),props={selectedDoc:{...doc,official_receipt_path:'synthetic-receipt.png'},setActiveModal:vi.fn(),handleSecretaryVerifyReceipt:confirm};
  const view=render(<ReceiptVerificationModal {...props} />);
  const submit=screen.getByRole('button',{name:'Confirm Receipt'});
  expect(submit).toBeDisabled();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(submit);
  expect(confirm).toHaveBeenCalledExactlyOnceWith('confirm',{physicalReceiptChecked:false});
  view.rerender(<ReceiptVerificationModal {...props} selectedDoc={{...props.selectedDoc,or_number:'SYN-OR-2'}} />);
  expect(screen.getByRole('checkbox')).not.toBeChecked();expect(submit).toBeDisabled();
});

it('keeps handoff cancellation as initial focus and blocks dismissal or mutation while saving',()=>{
  const cancel=vi.fn(),confirm=vi.fn();const view=render(<SecretaryHandoffModal document={doc} onConfirm={confirm} onCancel={cancel} />);
  expect(screen.getByRole('button',{name:'Cancel'})).toHaveFocus();
  view.rerender(<SecretaryHandoffModal document={doc} busy onConfirm={confirm} onCancel={cancel} />);
  fireEvent.keyDown(document,{key:'Escape'});fireEvent.click(screen.getByRole('button',{name:'Recording…'}));
  expect(confirm).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
});

it('steps actual printed pages, displays the saved-rate calculation read-only, and stages only on Save',()=>{
  const save=vi.fn();
  function Form(){const[pages,setPages]=useState(''),[notes,setNotes]=useState('');let breakdown=null;try{breakdown=calculateBreakdown(doc.pricing_schedule,{page_count:pages,copies:doc.copies},true);}catch{/* Incomplete draft. */}return <PricingModal selectedDoc={doc} pricePageCount={pages} setPricePageCount={setPages} priceAmount={breakdown?.total || ''} priceBreakdown={breakdown} priceNotes={notes} setPriceNotes={setNotes} setActiveModal={vi.fn()} handlePriceDocument={save} siblingsUnpriced={0} />;}
  render(<Form />);expect(screen.getByRole('button',{name:'Save & Bill Student'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Increase Pages printed per copy'}));
  expect(screen.getByLabelText('Calculated amount to charge')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Calculated amount to charge')).toHaveValue(100);
  expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Save & Bill Student'}));expect(save).toHaveBeenCalledOnce();
});
