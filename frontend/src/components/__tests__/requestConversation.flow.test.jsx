import { vi, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import api from '@/services/api';
vi.mock('@/services/api', () => ({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('@/services/realtimeService', () => ({onNotification:() => () => {}}));
const tickets=[11,12].map(id => ({id,subject:`Request TRC-${id}`,state:'QUEUED',category:'linked',document_id:id,read_only:false}));
beforeEach(()=>{
 vi.clearAllMocks(); window.history.replaceState(null,'','/dashboard?tab=messages'); Element.prototype.scrollIntoView=vi.fn();
 api.get.mockImplementation(async path=>({data:path==='/support/tickets' ? {tickets,next_cursor:null}
   : path.endsWith('/settings') ? {can_manage:false,available:false,settings:{}}
   : path.endsWith('/faq') ? {topics:[]}
   : path.endsWith('/threads') ? {threads:[],total:0}
   : {ticket:tickets.find(row=>path.endsWith(`/${row.id}`)),messages:[],next_cursor:null,window:{open:true},queue:{}}}));
 api.post.mockResolvedValue({data:{sent:{id:31,sender_id:3,message:'Please check my request.',created_at:'2026-10-06T02:00:00Z'}}});
});
it('focuses the selected ticket composer and Enter sends directly to that ticket',async()=>{
 const user=userEvent.setup(); render(<RequestMessagesPanel user={{id:3,role:'student'}} />);
 await user.click(await screen.findByRole('button',{name:/Request TRC-11/}));
 const input=await screen.findByLabelText('Message'); expect(input).toHaveFocus();
 await user.type(input,'Please check my request.{Enter}');
 await waitFor(()=>expect(api.post).toHaveBeenCalledOnce());
 const [url,payload,options]=api.post.mock.calls[0];
 expect(url).toBe('/support/tickets/11/messages'); expect(payload.get('message')).toBe('Please check my request.'); expect(payload.get('client_key')).toMatch(/^[a-zA-Z0-9_-]{16,64}$/); expect(options.timeout).toBe(30000);
 await waitFor(()=>expect(input).toHaveValue('')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('does not let a delayed response for a previous ticket clear the newly selected draft',async()=>{
 let accept; api.post.mockImplementation(()=>new Promise(resolve=>{accept=resolve;}));
 render(<RequestMessagesPanel user={{id:3,role:'student'}} />);
 fireEvent.click(await screen.findByRole('button',{name:/Request TRC-11/}));
 const input=await screen.findByLabelText('Message'); fireEvent.change(input,{target:{value:'Old ticket draft'}}); fireEvent.submit(input.closest('form'));
 fireEvent.click(screen.getByRole('button',{name:/Request TRC-12/}));
 const next=await screen.findByLabelText('Message'); await waitFor(()=>expect(next).toHaveFocus());
 fireEvent.change(next,{target:{value:'New ticket draft'}});
 await act(async()=>accept({data:{sent:{id:31,sender_id:3,message:'Old ticket draft',created_at:'2026-10-06T02:00:00Z'}}}));
 expect(next).toHaveValue('New ticket draft'); expect(screen.queryByText('Old ticket draft')).not.toBeInTheDocument();
});
