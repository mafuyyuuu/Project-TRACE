import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ReleaseDocumentModal from '@/features/window1/components/ReleaseDocumentModal';

it('focuses Cancel first, keeps physical-receipt evidence truthful, and guards a pending release', () => {
  const onCancel=vi.fn(),onConfirm=vi.fn();
  const props={document:{id:1,document_type:'Diploma',student_name:'Synthetic Applicant',tracking_number:'SYN-1',or_number:'OR-SYN-1',file_path:'unrelated-application.pdf'},onCancel,onConfirm};
  const {rerender}=render(<ReleaseDocumentModal {...props}/>);
  const cancel=screen.getByRole('button',{name:'Cancel'});
  expect(cancel).toHaveFocus();
  expect(screen.getByText(/No digital receipt on file/)).toBeInTheDocument();
  expect(screen.queryByTitle('Official Receipt copy')).not.toBeInTheDocument();
  fireEvent.click(cancel);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onConfirm).not.toHaveBeenCalled();
  rerender(<ReleaseDocumentModal {...props} busy/>);
  expect(cancel).toBeDisabled();
  expect(screen.getByRole('button',{name:'Releasing…'})).toBeDisabled();
  fireEvent.keyDown(document,{key:'Escape'});
  expect(onCancel).toHaveBeenCalledOnce();
  rerender(<ReleaseDocumentModal {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Release',exact:true}));
  expect(onConfirm).toHaveBeenCalledOnce();
});
