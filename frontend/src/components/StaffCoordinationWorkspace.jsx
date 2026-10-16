import { isCollegeOrFinance } from '@/utils/secretaryPresentation';
import SecretaryIcon, { SecretaryHeaderIcon } from '@/features/secretary/components/SecretaryIcon';
import { isWindowClerk } from '@/utils/windowPresentation';
import WindowIcon from '@/features/window1/components/WindowIcon';
import {Fragment,useLayoutEffect,useRef,useState} from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import SupportToasts from '@/components/SupportToasts';
import {MessageDateSeparator,SupportIcon,TicketAvatar} from '@/components/SupportVisuals';
import {supportDay,supportTime} from '@/utils/supportPresentation';
import useStaffConversations,{useStaffConversation,useStaffRecipients} from '@/hooks/useStaffConversations';
import useMotion from '@/hooks/useMotion';
const title=(thread,user)=>thread.participants.filter(row=>Number(row.id)!==Number(user.id)).map(row=>row.full_name).join(' · ');
function Conversation({id,user,onNotice,onChanged}) {
  const chat=useStaffConversation(id,user,onNotice,onChanged),thread=chat.data?.conversation;
  const history=useRef(null),pinned=useRef(true),older=useRef(null);useMotion(history,id,'context');
  useLayoutEffect(()=>{const node=history.current;if(!node)return;
    if(older.current&&!chat.loadingOlder){node.scrollTop=node.scrollHeight-older.current.height+older.current.top;older.current=null;}
    else if(pinned.current)node.scrollTop=node.scrollHeight;
  },[chat.messages,chat.loadingOlder]);
  return <section aria-label="Selected staff conversation" className="flex h-full min-h-0 min-w-0 flex-col bg-gray-50 dark:bg-gray-950">
    <header tabIndex={0} className="max-h-[30%] shrink-0 space-y-2 overflow-y-auto border-b border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="select-text break-words font-bold">{thread ? title(thread,user) : 'Staff conversation'}</h3>
      {thread&&<p className="select-text break-words text-sm text-gray-600 dark:text-gray-300">{thread.participants.map(row=>`${row.full_name} (${row.desk_assignment})`).join(' · ')}</p>}
      <p className="text-xs text-gray-600 dark:text-gray-300">{user.role==='admin' ? 'Admin monitoring — read-only.' : thread&&!thread.can_send ? 'Read-only history. A participant or college assignment is unavailable.' : 'Staff coordination · Student conversations remain in Support tickets.'}</p>
    </header>
    <div ref={history} tabIndex={0} aria-label="Staff conversation history" onScroll={event=>{const node=event.currentTarget;pinned.current=node.scrollHeight-node.scrollTop-node.clientHeight<32;}} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 focus-visible:outline focus-visible:outline-green-700">
      {chat.loading&&<p role="status">Loading staff conversation…</p>}
      {chat.cursor&&<Button type="button" disabled={chat.loadingOlder} onClick={()=>{const node=history.current;older.current={height:node.scrollHeight,top:node.scrollTop};pinned.current=false;void chat.refresh(chat.cursor);}} className="trace-button trace-button-secondary">Load older messages</Button>}
      {chat.messages.map((row,index)=><Fragment key={row.id}>
        {(!index||supportDay(row.created_at)!==supportDay(chat.messages[index-1].created_at))&&<MessageDateSeparator value={row.created_at}/>}
        <article className={`trace-support-bubble ${Number(row.sender_id)===Number(user.id)?'trace-support-bubble-outgoing':''}`}>
          <p className="font-semibold">{Number(row.sender_id)===Number(user.id)?'You':row.sender_name}</p>
          <p className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{row.message}</p>
          <time className="block text-right text-xs" dateTime={row.created_at}>{supportTime(row.created_at)} (Manila)</time>
        </article>
      </Fragment>)}
    </div>
    <footer className="max-h-[35%] shrink-0 space-y-2 overflow-y-auto border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {chat.error&&<p role="alert" className="trace-inline-error text-sm">{chat.error} <Button type="button" onClick={()=>void chat.refresh()} className="trace-action underline">Refresh conversation</Button></p>}
      {thread?.can_send&&user.role!=='admin'&&<form onSubmit={chat.send} aria-busy={chat.busy} className="flex min-w-0 items-center gap-2 rounded-full border border-gray-300 p-2 shadow-sm dark:border-gray-600">
        <label className="min-w-0 flex-1"><span className="sr-only">Staff message</span><input aria-label="Staff message" value={chat.draft} onChange={event=>chat.setDraft(event.target.value)} maxLength={2000} disabled={chat.busy} placeholder="Write your message…" className="min-h-11 w-full min-w-0 rounded-full bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:opacity-60"/></label>
        <Button type="submit" aria-label={chat.busy?'Sending…':'Send staff message'} disabled={chat.busy||!chat.draft.trim()} className="trace-icon-button"><SupportIcon name="send"/></Button>
      </form>}
      <p className="text-xs text-gray-600 dark:text-gray-300">Visible to participants and Admin monitors. Use Internal Assistance for Admin concerns.</p>
    </footer>
  </section>;
}
export default function StaffCoordinationWorkspace({user,requestedConversation,active=true}) {
  const state=useStaffConversations(user,requestedConversation),[showList,setShowList]=useState(false),[creating,setCreating]=useState(false);
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[recipient,setRecipient]=useState(null),[draft,setDraft]=useState(''),[staged,setStaged]=useState(null);
  const windowClerk=isWindowClerk(user), secretary=isCollegeOrFinance(user);
  const creationRetry=useRef(null);
  const choices=useStaffRecipients(active&&creating&&user.role!=='admin',search);
  const rows=state.rows.filter(row=>title(row,user).toLowerCase().includes(query.trim().toLowerCase()));
  const list=<div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 space-y-3 border-b-2 border-pine-600 p-4"><label className="trace-label block">Search loaded conversations<span className="mt-2 flex items-center gap-2 rounded-full border border-gray-300 px-3 dark:border-gray-600"><SupportIcon name="search"/><input type="search" maxLength={255} value={query} onChange={event=>setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600"/></span></label><p className="text-xs text-gray-600 dark:text-gray-300">{rows.length} loaded · Newest conversation first</p></div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {state.loading&&<p role="status" className="p-4">Loading staff conversations…</p>}
      {!state.loading&&!rows.length&&<p className="p-4 text-sm">No staff conversations match this view.</p>}
      {rows.map(row=><Button key={row.id} type="button" aria-pressed={String(row.id)===String(state.selected)} onClick={()=>{state.setSelected(String(row.id));setShowList(false);}} className="trace-support-ticket trace-button-lift w-full text-left"><span className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-3"><TicketAvatar ticket={{student_name:title(row,user)}}/><span className="min-w-0 space-y-1"><span className="block break-words font-bold">{title(row,user)}</span><span className="block break-words text-xs text-gray-600 dark:text-gray-300">{row.participants.map(p=>p.desk_assignment).join(' · ')}</span><span className="block text-xs text-gray-600 dark:text-gray-300">#{row.id} · {supportDay(row.updated_at)} · {supportTime(row.updated_at)} (Manila)</span></span></span></Button>)}
      {state.cursor&&<div className="p-4"><Button type="button" onClick={()=>void state.refresh(state.cursor)} className="trace-button trace-button-secondary">Load older conversations</Button></div>}
    </div>
  </div>;
  return <section aria-label="Staff coordination workspace" className="min-w-0 space-y-4">
    <header className="trace-page-header"><h2 className="trace-page-title break-words">{windowClerk || secretary ? 'Support' : 'Staff Coordination'}</h2><div className="flex flex-wrap gap-2"><Button type="button" onClick={()=>setShowList(true)} className="trace-button trace-button-secondary lg:hidden">Staff conversations</Button>{user.role!=='admin'&&<Button type="button" disabled={state.busy} onClick={()=>setCreating(true)} className="trace-button trace-button-primary"><SupportIcon name="plus"/>New conversation</Button>}</div></header>
    <p className="text-sm text-gray-600 dark:text-gray-300">{user.role==='admin'?'Monitor operational staff discussions. Admin cannot send or intervene.':'Coordinate with an authorized desk colleague. Secretary-to-Secretary recipients stay within the same college.'}</p>
    {state.error&&<p role="alert" className="trace-inline-error">{state.error} <Button type="button" onClick={()=>void state.refresh()} className="trace-action underline">Retry staff coordination</Button></p>}
    <div className="grid h-[75dvh] min-h-96 min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2.4fr)]"><aside className="hidden min-h-0 min-w-0 border-r border-gray-200 dark:border-gray-700 lg:block">{list}</aside>{state.selected?<Conversation key={`${user.id}:${state.selected}`} id={state.selected} user={user} onNotice={state.feedback.notify} onChanged={state.refresh}/>:windowClerk || secretary ? <div className="trace-window-empty-conversation"><div><span className="trace-window-empty-icon">{secretary ? <SecretaryIcon name="58866" /> : <WindowIcon name="chat"/>}</span><h3>Select a staff conversation.</h3><p>Choose a conversation from the list, or start one with an authorized colleague.</p><Button type="button" aria-label="Start a staff conversation" onClick={()=>setCreating(true)} className="trace-button trace-button-primary"><WindowIcon name="plus"/>New conversation</Button></div></div> : <div className="flex items-center justify-center p-6 text-center text-sm">Select a staff conversation{user.role!=='admin'?' or choose New conversation.':'.'}</div>}</div>
    <ModalShell open={active&&showList} onClose={()=>setShowList(false)} title="Staff Conversations" bodyClassName="min-h-0 flex-1 overflow-hidden" panelClassName="trace-modal-panel max-w-sm h-[80dvh]" footer={<Button type="button" onClick={()=>setShowList(false)} className="trace-button trace-button-secondary">Back to conversation</Button>}>{list}</ModalShell>
    <ModalShell open={active&&creating} busy={state.busy} onClose={()=>{if(!state.busy)setCreating(false);}} title="New Staff Conversation" headerIcon={secretary ? <SecretaryHeaderIcon name="5d209" /> : undefined} subtitle={secretary ? "Start a direct conversation with an authorized staff member." : windowClerk ? "Start a conversation with an authorized desk colleague." : undefined} panelClassName={secretary ? "trace-modal-panel trace-secretary-dialog trace-secretary-staff-create max-w-[540px]" : windowClerk ? "trace-modal-panel trace-admin-main-dialog trace-window-dialog trace-window-staff max-w-[640px]" : undefined} footer={<div className="trace-actions justify-end">{(windowClerk || secretary) && <Button type="button" disabled={state.busy} onClick={()=>setCreating(false)} className="trace-button trace-button-secondary">Cancel</Button>}<Button type="submit" form="staff-conversation-create" disabled={state.busy||!recipient||!draft.trim()} className="trace-button trace-button-primary">Review conversation{secretary && <SecretaryIcon name="dd3ed" />}</Button></div>}>
      <form id="staff-conversation-create" onSubmit={event=>{event.preventDefault();if(recipient&&draft.trim()){const message=draft.trim();if(creationRetry.current?.recipient_id!==recipient.id||creationRetry.current?.message!==message)creationRetry.current={recipient_id:recipient.id,message,client_key:crypto.randomUUID()};setStaged({...creationRetry.current,name:recipient.full_name});}}} className="space-y-4">
        <label className="trace-label block">Find recipient<input type="search" value={search} maxLength={255} onChange={event=>setSearch(event.target.value)} placeholder="Name or desk…" className="trace-control mt-1 w-full"/></label>
        <p className="text-xs text-gray-600 dark:text-gray-300">Active authorized staff only. Students, Admin and your own account are excluded.</p>
        {choices.loading&&<p role="status">Loading staff recipients…</p>}
        {choices.error&&<p role="alert">{choices.error} <Button type="button" onClick={()=>void choices.refresh()} className="trace-action underline">Retry recipients</Button></p>}
        <div role="group" aria-label="Staff recipients" className="max-h-60 space-y-2 overflow-y-auto">{choices.rows.map(row=><Button key={row.id} type="button" aria-pressed={Number(recipient?.id)===Number(row.id)} onClick={()=>setRecipient(row)} className="trace-support-ticket trace-button-lift w-full text-left"><span className={secretary ? "trace-secretary-recipient" : "trace-window-recipient"}><TicketAvatar ticket={{student_name:row.full_name}}/><span><span className="block break-words font-semibold">{row.full_name}</span><span className="block break-words text-xs">{row.desk_assignment}{row.college_name?` · ${row.college_name}`:''}</span></span>{windowClerk && Number(recipient?.id)===Number(row.id) && <WindowIcon name="18446"/>}</span></Button>)}</div>
        {!choices.loading&&!choices.rows.length&&!choices.error&&<p className="text-sm">No eligible recipients match.</p>}
        {choices.cursor&&<Button type="button" disabled={choices.loading} onClick={()=>void choices.refresh(choices.cursor)} className="trace-button trace-button-secondary">Load more recipients</Button>}
        {recipient&&<p className="select-text text-sm">Recipient: {recipient.full_name} · {recipient.desk_assignment}</p>}
        <label className="trace-label block">First message<textarea required maxLength={2000} value={draft} onChange={event=>setDraft(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full"/></label>
      </form>
    </ModalShell>
    <ConfirmDialog open={active&&Boolean(staged)} title="Start Staff Conversation?" message={`Send this first message to ${staged?.name || 'the selected staff member'}? An existing conversation with this colleague is reused.`} loading={state.busy} onCancel={()=>{if(!state.busy)setStaged(null);}} onConfirm={async()=>{const payload={recipient_id:staged.recipient_id,message:staged.message,client_key:staged.client_key};if(await state.open(payload)){creationRetry.current=null;setStaged(null);setCreating(false);setRecipient(null);setDraft('');setSearch('');}}}>
      <p className="mt-3 select-text whitespace-pre-wrap break-words text-sm">{staged?.message}</p>{state.error&&<p role="alert" className="trace-inline-error mt-3">{state.error}</p>}
    </ConfirmDialog>
    {active&&<SupportToasts notices={state.feedback.notices} onDismiss={state.feedback.dismiss} onDismissAll={state.feedback.dismissAll}/>}
  </section>;
}
