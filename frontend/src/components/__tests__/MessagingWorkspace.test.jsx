import {expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import MessagingWorkspace from '@/components/MessagingWorkspace';
vi.mock('@/components/SupportWorkspace',()=>({default:({requestedTicket})=><p>Support ticket {requestedTicket}</p>}));
vi.mock('@/components/InternalAssistanceWorkspace',()=>({default:()=> <p>Internal ticket workspace</p>}));
vi.mock('@/components/StaffCoordinationWorkspace',()=>({default:({requestedConversation})=><label>Staff draft<input defaultValue=""/>Conversation {requestedConversation}</label>}));
const mount=(user,entry='/dashboard?tab=messages')=>render(<MemoryRouter initialEntries={[entry]}><MessagingWorkspace user={user}/></MemoryRouter>);
it('groups student/case support, staff coordination and internal assistance for Window 1',()=>{
  mount({id:4,role:'clerk',desk_assignment:'Window 1'});expect(screen.getByRole('tab',{name:'Student & case support'})).toHaveAttribute('aria-selected','true');fireEvent.click(screen.getByRole('tab',{name:'Staff coordination'}));expect(screen.getByLabelText(/Staff draft/)).toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'Internal assistance'}));expect(screen.getByText('Internal ticket workspace')).toBeVisible();
});
it('labels Finance support as case-linked and preserves staff drafts across category changes',()=>{
  mount({id:4,role:'clerk',desk_assignment:'Finance'},'/dashboard?tab=messages&category=staff&conversation=21');const input=screen.getByLabelText(/Staff draft/);fireEvent.change(input,{target:{value:'Retained draft'}});fireEvent.click(screen.getByRole('tab',{name:'Case-linked conversations'}));fireEvent.click(screen.getByRole('tab',{name:'Staff coordination'}));expect(screen.getByLabelText(/Staff draft/)).toBe(input);expect(input).toHaveValue('Retained draft');
});
it('passes support notification ticket identifiers to the existing workflow',()=>{
  mount({id:9,role:'admin'},'/dashboard?tab=messages&ticket=18');expect(screen.getByText('Support ticket 18')).toBeInTheDocument();
});
