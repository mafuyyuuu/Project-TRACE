import {act,renderHook,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import useConversationRead from '@/hooks/useConversationRead';
import {markConversationRead} from '@/services/conversationReadService';
vi.mock('@/services/conversationReadService',()=>({markConversationRead:vi.fn().mockResolvedValue({})}));
it('reads only a visible selected conversation at the bottom and rechecks when scrolled',async()=>{
  const node=document.createElement('div');document.body.append(node);
  Object.defineProperties(node,{scrollHeight:{value:1000},clientHeight:{value:100}});node.scrollTop=0;
  const history={current:node},onRead=vi.fn();
  const {rerender,unmount}=renderHook(({active,messages})=>useConversationRead('support',11,messages,history,active,onRead),{initialProps:{active:false,messages:[{id:5}]}});
  expect(markConversationRead).not.toHaveBeenCalled();rerender({active:true,messages:[{id:5}]});expect(markConversationRead).not.toHaveBeenCalled();
  await act(async()=>{node.scrollTop=900;node.dispatchEvent(new Event('scroll'));});
  expect(markConversationRead).toHaveBeenCalledWith('support',11,5,expect.any(AbortSignal));expect(onRead).toHaveBeenCalledTimes(1);
  rerender({active:false,messages:[{id:6}]});expect(markConversationRead).toHaveBeenCalledTimes(1);
  rerender({active:true,messages:[{id:6}]});await waitFor(()=>expect(markConversationRead).toHaveBeenCalledTimes(2));
  unmount();node.remove();
});
