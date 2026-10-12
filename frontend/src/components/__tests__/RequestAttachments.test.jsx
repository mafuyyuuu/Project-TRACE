import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import RequestAttachments from '@/components/RequestAttachments';
const state=vi.hoisted(()=>({rows:[],types:[{id:2,name:'School record',is_active:true}],readOnly:false,loading:false,error:'',saving:false,staged:null,stage:vi.fn(),confirm:vi.fn(),cancel:vi.fn(),refresh:vi.fn()}));
vi.mock('@/hooks/useRequestAttachments',()=>({default:()=>state}));
vi.mock('@/hooks/useAuthedFile',()=>({default:()=>({url:null}),toFilename:path=>path || ''}));
const student={id:3,role:'student'},clerk={id:4,role:'clerk',desk_assignment:'Window 1'};
const row={id:9,catalog_id:2,label:'School record',instructions:'Scan both sides.',status:'requested',created_at:'2026-10-05T00:00:00Z'};
beforeEach(()=>{Object.assign(state,{rows:[],types:[{id:2,name:'School record',is_active:true}],error:'',staged:null,saving:false,readOnly:false});vi.clearAllMocks();});
it('has no fixed requirements or staff creation action in the student view',()=>{
 render(<RequestAttachments documentId={11} user={student}/>);
 expect(screen.getByText(/No additional documents requested/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Request supporting document'})).not.toBeInTheDocument();
});
it('opens a compact catalog-based confirmed staff request instead of a bulky free-text form',()=>{
 render(<RequestAttachments documentId={11} user={clerk}/>);
 expect(screen.queryByLabelText('Required Document')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/Request supporting document/}));
 fireEvent.change(screen.getByLabelText('Required Document'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('Case-specific Instructions'),{target:{value:'Scan both sides.'}});
 fireEvent.click(screen.getByRole('button',{name:'Request document'}));
 expect(state.stage).toHaveBeenCalledWith({kind:'request',catalog_id:2,replacement_of:undefined,instructions:'Scan both sides.'});
});
it('opens the upload control for the exact student requirement and does not save on selection',()=>{
 state.rows=[row];render(<RequestAttachments documentId={11} user={student}/>);
 fireEvent.click(screen.getByRole('button',{name:'Upload file for School record'}));
 const file=new File(['synthetic'],'case.png',{type:'image/png'});fireEvent.change(screen.getByLabelText('School record',{selector:'input'}),{target:{files:[file]}});
 expect(state.stage).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Submit document'}));expect(state.stage).toHaveBeenCalledWith({kind:'upload',id:9,file});
});
it('requires reasoned rejection and preserves corrected-copy actions',()=>{
 state.rows=[{...row,status:'uploaded'}];state.error='Unavailable';render(<RequestAttachments documentId={11} user={clerk}/>);
 fireEvent.click(screen.getByRole('button',{name:'Review School record'}));const dialog=screen.getByRole('dialog',{name:'Review School record'});
 expect(within(dialog).getByRole('alert')).toHaveTextContent('Unavailable');expect(within(dialog).getByRole('button',{name:'Request corrected copy'})).toBeDisabled();
 fireEvent.change(within(dialog).getByLabelText('Review Notes'),{target:{value:'Back page missing.'}});fireEvent.click(within(dialog).getByRole('button',{name:'Request corrected copy'}));expect(state.stage).toHaveBeenCalledWith({kind:'review',id:9,action:'resubmit',notes:'Back page missing.'});
});
it('keeps closed or superseded case requirements visible without upload/review actions',()=>{
 state.rows=[row];state.readOnly=true;render(<RequestAttachments documentId={11} user={student}/>);
 expect(screen.getByText('School record')).toBeInTheDocument();expect(screen.queryByRole('button',{name:/Upload file/})).not.toBeInTheDocument();
});
