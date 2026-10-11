import {useSearchParams} from 'react-router-dom';
import {useEffect,useState} from 'react';
import QueueTabs from '@/components/QueueTabs';
import SupportWorkspace from '@/components/SupportWorkspace';
import StaffCoordinationWorkspace from '@/components/StaffCoordinationWorkspace';
import InternalAssistanceWorkspace from '@/components/InternalAssistanceWorkspace';
export default function MessagingWorkspace({user}) {
  const [params,setParams]=useSearchParams(),category=params.get('category'),active=category==='staff'?'staff':category==='internal'?'internal':'support';
  const [visited,setVisited]=useState(()=>new Set([active]));
  useEffect(()=>{queueMicrotask(()=>setVisited(previous=>previous.has(active)?previous:new Set([...previous,active])));},[active]);
  const windowClerk=['Window 1','Receiving Desk'].includes(user.desk_assignment),canGeneral=user.role==='admin'||windowClerk;
  const change=next=>{const query=new URLSearchParams(params);query.set('category',next);for(const key of ['ticket','document','support','conversation','internalTicket'])query.delete(key);setParams(query);};
  return <section className="min-w-0 space-y-5" aria-label="Messaging categories">
    <QueueTabs idPrefix="message-category" label="Conversation categories" activeKey={active} onChange={change} tabs={[{key:'support',label:canGeneral?'Student & case support':'Case-linked conversations'},{key:'staff',label:'Staff coordination'},{key:'internal',label:'Internal assistance'}]}/>
    <div id="message-category-panel" role="tabpanel" aria-labelledby={`message-category-${active}`}>
      {/* Retain drafts while switching categories; mount only visited workspaces. */}
      <div hidden={active!=='support'}>{(active==='support'||visited.has('support'))&&<SupportWorkspace user={user} initialDocumentId={params.get('document')} requestedTicket={params.get('ticket')} active={active==='support'} autoFocusConversation={active==='support'}/>}</div>
      <div hidden={active!=='staff'}>{(active==='staff'||visited.has('staff'))&&<StaffCoordinationWorkspace user={user} requestedConversation={params.get('conversation')} active={active==='staff'}/>}</div>
      <div hidden={active!=='internal'}>{(active==='internal'||visited.has('internal'))&&<InternalAssistanceWorkspace user={user} requestedTicket={params.get('internalTicket')} active={active==='internal'}/>}</div>
    </div>
  </section>;
}
