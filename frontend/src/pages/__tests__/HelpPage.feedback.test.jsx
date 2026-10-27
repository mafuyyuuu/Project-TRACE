import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import HelpPage from '@/pages/HelpPage';
import * as service from '@/services/manualFaqService';
vi.mock('@/hooks/useSupportFaq',()=>({default:()=>({topics:[],error:''})}));
vi.mock('@/services/manualFaqService',()=>({getManualFeedback:vi.fn(),recordManualFaq:vi.fn()}));
const question='How do confirmations work?';
beforeEach(()=>{vi.clearAllMocks();service.getManualFeedback.mockResolvedValue([]);service.recordManualFaq.mockResolvedValue(undefined);});
it.each([{id:1,role:'admin'},{id:2,role:'student',user_type:'student'},{id:3,role:'student',user_type:'alumni'},...['Window 1','Receiving Desk','Secretary','Finance'].map((desk_assignment,index)=>({id:index+10,role:'clerk',desk_assignment}))])('persists No suggestions from each account manual',async user=>{
  await act(async()=>render(<HelpPage user={user}/>));fireEvent.change(screen.getByRole('searchbox'),{target:{value:question}});
  const details=screen.getByText(question).closest('details');await act(async()=>{details.open=true;fireEvent(details,new Event('toggle'));});
  fireEvent.click(within(details).getByRole('button',{name:'No'}));const field=await within(details).findByRole('textbox',{name:/What should we improve/});expect(field).toHaveAttribute('maxlength','2000');
  await waitFor(()=>expect(within(details).getByRole('button',{name:'Send feedback'})).toBeEnabled());fireEvent.change(field,{target:{value:'Please include an example.'}});
  fireEvent.submit(within(details).getByRole('form'));await waitFor(()=>expect(service.recordManualFaq).toHaveBeenCalledWith(expect.objectContaining({question,action:'not_helpful',suggestion:'Please include an example.'}),expect.any(AbortSignal)));
  await waitFor(()=>expect(within(details).getByRole('status')).toHaveTextContent('Feedback saved. Thank you!'));
  expect(within(details).getByRole('button',{name:'Yes'})).toHaveAttribute('aria-pressed','false');
  expect(within(details).getByRole('button',{name:'No'})).toHaveAttribute('aria-pressed','false');
  expect(within(details).queryByRole('textbox')).not.toBeInTheDocument();
});
it('drops another account’s private feedback and draft on identity change',async()=>{
  service.getManualFeedback.mockResolvedValueOnce([{question,action:'not_helpful',suggestion:'First account private draft'}]);
  const {rerender}=render(<HelpPage user={{id:1,role:'student'}}/>);await waitFor(()=>expect(service.getManualFeedback).toHaveBeenCalledTimes(1));
  await act(async()=>rerender(<HelpPage user={{id:2,role:'student'}}/>));expect(screen.queryByDisplayValue('First account private draft')).not.toBeInTheDocument();
});
