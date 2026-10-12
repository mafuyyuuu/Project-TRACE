import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,within,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceiptPackControl from '@/features/finance/components/ReceiptPackControl';
import ReceiptIssueModal from '@/features/finance/components/ReceiptIssueModal';
import FinanceVerificationModal from '@/features/finance/components/FinanceVerificationModal';
import DeferredOrUploadModal from '@/features/finance/components/DeferredOrUploadModal';
import {receiptHtml} from '@/utils/receiptPrint';
import * as api from '@/services/receiptService';
vi.mock('@/utils/receiptTiming',async importOriginal=>({...await importOriginal(),receiptWindow:()=>({afterCutoff:false})}));
vi.mock('@/services/receiptService',()=>({receiptState:vi.fn(),previewPack:vi.fn(),savePack:vi.fn(),issueReceipt:vi.fn(),receiptError:err=>err.message}));
vi.mock('@/components/RequestMessagesPanel',()=>({default:()=>null}));
const config={width_mm:150,height_mm:290,margin_mm:5,offset_x_mm:0,offset_y_mm:0};
const state={version:2,pack:{id:1,consumed:0,next_serial:'DEMO00001',last_serial:'DEMO00050'},print_config:config};
const doc={id:11,request_group_id:'DEMO-GROUP',student_id:'DEMO001',student_name:'Demo Person',document_type:'TOR',amount:100};
beforeEach(()=>{vi.clearAllMocks();api.receiptState.mockResolvedValue(state);api.previewPack.mockResolvedValue({first:['2026-00001','2026-00002','2026-00003'],last:'2026-00050'});api.savePack.mockResolvedValue({});api.issueReceipt.mockResolvedValue({id:3});});
it('replaces manual number entry with pack setup and read-only next number',async()=>{
 const user=userEvent.setup(),changed=vi.fn();render(<ReceiptPackControl packState={{...state,pack:null}} onChanged={changed}/>);await user.click(screen.getByRole('button',{name:'Input Issuance Number'}));await user.type(screen.getByLabelText('First issuance number'),'2026-00001');await user.type(screen.getByLabelText('Last issuance number'),'2026-00050');expect(screen.queryByLabelText('Numeric segment to increment')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Review Pack'}));await screen.findByText(/2026-00050. This reserves exactly 50/);expect(api.savePack).not.toHaveBeenCalled();await user.click(within(screen.getByRole('dialog',{name:'Activate paper pack?'})).getByRole('button',{name:'Cancel'}));expect(screen.getByLabelText('First issuance number')).toHaveValue('2026-00001');await user.click(screen.getByRole('button',{name:'Review Pack'}));await user.click(await screen.findByRole('button',{name:'Activate Pack'}));await waitFor(()=>expect(api.savePack).toHaveBeenCalledOnce());expect(changed).toHaveBeenCalledOnce();
});
it('retains confirmation and the retry key on an ambiguous network failure',async()=>{
 const user=userEvent.setup(),issued=vi.fn();api.issueReceipt.mockRejectedValueOnce(new Error('Network unavailable.'));render(<ReceiptIssueModal document={doc} onClose={vi.fn()} onIssued={issued}/>);await screen.findByDisplayValue('DEMO00001');expect(screen.getByDisplayValue('DEMO00001')).toHaveAttribute('readonly');await user.click(screen.getByRole('button',{name:'Review Issuance'}));expect(api.issueReceipt).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Issue Receipt'}));expect(await within(screen.getByRole('dialog',{name:'Confirm receipt issuance'})).findByRole('alert')).toHaveTextContent('Network unavailable.');const firstKey=api.issueReceipt.mock.calls[0][1].client_key;await user.click(screen.getByRole('button',{name:'Issue Receipt'}));await waitFor(()=>expect(issued).toHaveBeenCalledOnce());expect(api.issueReceipt.mock.calls[1][1].client_key).toBe(firstKey);
});
it('stages managed verification metadata, and Later preserves issuance and only defers the copy',async()=>{
 const user=userEvent.setup(),verify=vi.fn();render(<FinanceVerificationModal selectedDoc={doc} user={{role:'clerk'}} setActiveModal={vi.fn()} setViewImageUrl={vi.fn()} handleFinanceVerify={verify} clerkNotes="" setClerkNotes={vi.fn()}/>);await screen.findByDisplayValue('DEMO00001');await user.click(screen.getByRole('button',{name:'Verify Payment'}));expect(verify).toHaveBeenCalledWith('approve',null,'',expect.objectContaining({usePack:true,expected_serial:'DEMO00001',expected_pack_id:1}));await user.click(screen.getByRole('checkbox',{name:/Later/}));await user.click(screen.getByRole('button',{name:'Verify Payment'}));expect(verify.mock.calls[1][3]).toMatchObject({usePack:true,deferred:false,uploadLater:true});expect(screen.getByDisplayValue('DEMO00001')).toBeInTheDocument();expect(screen.getByLabelText('Official Receipt copy (optional)')).toBeDisabled();expect(screen.queryByLabelText(/Payor name/)).not.toBeInTheDocument();expect(screen.queryByText('Discussion')).not.toBeInTheDocument();
});
it('validates copy type/size and preserves a selected file after cancel',async()=>{
 const user=userEvent.setup(),upload=vi.fn();render(<DeferredOrUploadModal selectedDoc={{...doc,or_number:'DEMO00001',receipt_id:3}} setActiveModal={vi.fn()} handleDeferredUpload={upload}/>);
 const picker=screen.getByLabelText('Official POS Receipt');await user.upload(picker,new File([new Uint8Array(5*1024*1024+1)],'large.png',{type:'image/png'}));expect(screen.getByRole('alert')).toHaveTextContent('5 MB');expect(screen.getByRole('button',{name:'Upload Receipt'})).toBeDisabled();const file=new File(['demo'],'demo.pdf',{type:'application/pdf'});await user.upload(picker,file);fireEvent.submit(screen.getByRole('button',{name:'Upload Receipt'}).form);await user.click(within(screen.getByRole('dialog',{name:'Upload Official Receipt Copy'})).getByRole('button',{name:'Cancel'}));expect(screen.getByText(/Selected: demo.pdf/)).toBeInTheDocument();expect(upload).not.toHaveBeenCalled();
});
it('prints saved snapshot values with escaped text, payment reference and data-only labels',()=>{
 const html=receiptHtml({serial:'DEMO00001',issue_date:'2026-10-11',student_id:'DEMO001',payor_name:'Person, Demo <script>',cashier_name:'Demo Cashier',payment_reference:'PAY-DEMO',items:[{document_type:'TOR',amount_centavos:10050,fund_code:'',account_code:''}],total_centavos:10050,amount_words:'One Hundred Pesos and 50/100'},config,'data-only');expect(html).toContain('100.50');expect(html).toContain('PAY-DEMO');expect(html).toContain('Person, Demo &lt;script&gt;');expect(html).toContain('class="data-only"');expect(html).not.toContain('tracking_number');expect(html).toContain('@page{size:150mm 290mm;margin:5mm}');
});

it('keeps Print beside the saved receipt and cannot verify or allocate a second number',async()=>{
 const user=userEvent.setup(),verify=vi.fn();
 const receipt={id:3,serial:'DEMO00001',state:'ISSUED',snapshot:{payor_name:'Demo Person',items:[],total_centavos:10000,amount_words:'One Hundred Pesos and 00/100',issue_date:'2026-10-11'}};
 render(<FinanceVerificationModal selectedDoc={doc} verifiedReceipt={receipt} setActiveModal={vi.fn()} setViewImageUrl={vi.fn()} handleFinanceVerify={verify} clerkNotes="" setClerkNotes={vi.fn()}/>);
 const print=await screen.findByRole('button',{name:'Print'});await waitFor(()=>expect(print).toBeEnabled());
 expect(screen.getByRole('button',{name:'Payment Verified'})).toBeDisabled();
 expect(screen.getByLabelText('Recorded Official Receipt Number')).toHaveValue('DEMO00001');
 await user.click(print);expect(screen.getByTitle('Official Receipt print preview')).toBeInTheDocument();expect(verify).not.toHaveBeenCalled();
});
it('replacement uses first and last fields without refresh or replacement-reason controls',async()=>{
 const user=userEvent.setup();render(<ReceiptPackControl packState={state} onChanged={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:'Replace paper pack'}));
 expect(screen.getByLabelText('First issuance number')).toBeInTheDocument();expect(screen.getByLabelText('Last issuance number')).toBeInTheDocument();
 expect(screen.queryByLabelText(/Reason for replacement/)).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Refresh/})).not.toBeInTheDocument();
});
