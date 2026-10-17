import { isCollegeOrFinance } from '@/utils/secretaryPresentation';
import {useSearchParams} from 'react-router-dom';
import {useEffect,useState} from 'react';
import QueueTabs from '@/components/QueueTabs';
import SupportWorkspace from '@/components/SupportWorkspace';
import StaffCoordinationWorkspace from '@/components/StaffCoordinationWorkspace';
import InternalAssistanceWorkspace from '@/components/InternalAssistanceWorkspace';
export default function MessagingWorkspace({user,initialCategory='support'}) {
  const [params,setParams]=useSearchParams(),category=params.get('category') || initialCategory,active=category==='staff'?'staff':category==='internal'?'internal':'support';
  const [visited,setVisited]=useState(()=>new Set([active]));
  useEffect(()=>{queueMicrotask(()=>setVisited(previous=>previous.has(active)?previous:new Set([...previous,active])));},[active]);
  const windowClerk=['Window 1','Receiving Desk'].includes(user.desk_assignment),canGeneral=user.role==='admin'||windowClerk;
  const deskTitle = windowClerk || isCollegeOrFinance(user);
  const title = deskTitle || active === 'support' ? 'Support' : active === 'staff' ? 'Staff Coordination' : 'Internal Assistance';
  const change=next=>{const query=new URLSearchParams(params);query.set('tab','messages');query.set('category',next);for(const key of ['ticket','document','support','conversation','internalTicket'])query.delete(key);setParams(query);};
  return <section className={"trace-messaging " + (isCollegeOrFinance(user) ? 'trace-window-messaging trace-secretary-messaging' : windowClerk && user.role === 'clerk' ? 'trace-window-messaging' : user.role === 'admin' ? 'trace-admin-messaging' : '')} aria-label="Messaging categories">
    <header className="trace-page-header trace-standard-heading"><div><h2 className="trace-page-title">{title}</h2><p className="trace-page-description">{active === 'support' ? 'Student and request support within your existing desk permissions.' : active === 'staff' ? 'Coordinate handoffs and case concerns with authorized staff.' : 'Report account and system concerns to Admin.'}</p></div></header>
    <QueueTabs idPrefix="message-category" label="Conversation categories" activeKey={active} onChange={change} tabs={[{key:'support',label:canGeneral?'Student & case support':'Case-linked conversations'},{key:'staff',label:'Staff coordination'},{key:'internal',label:'Internal assistance'}]}/>
    <div id="message-category-panel" role="tabpanel" aria-labelledby={`message-category-${active}`}>
      {/* Retain drafts while switching categories; mount only visited workspaces. */}
      <div hidden={active!=='support'}>{(active==='support'||visited.has('support'))&&<SupportWorkspace embedded user={user} initialDocumentId={params.get('document')} requestedTicket={params.get('ticket')} requestedSupport={params.get('support')} active={active==='support'} autoFocusConversation={active==='support'}/>}</div>
      <div hidden={active!=='staff'}>{(active==='staff'||visited.has('staff'))&&<StaffCoordinationWorkspace embedded user={user} requestedConversation={params.get('conversation')} active={active==='staff'}/>}</div>
      <div hidden={active!=='internal'}>{(active==='internal'||visited.has('internal'))&&<InternalAssistanceWorkspace embedded user={user} requestedTicket={params.get('internalTicket')} active={active==='internal'}/>}</div>
    </div>
  </section>;
}
