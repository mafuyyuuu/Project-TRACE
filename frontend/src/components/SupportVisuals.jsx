import Button from '@/components/Button';
import { SUPPORT_STATES, ticketInitials, supportDay, supportTime } from '@/utils/supportPresentation';
import empty from '@/assets/support/empty-conversation.png';
import support from '@/assets/support/support.svg';
import close from '@/assets/support/close.svg';
import chevron from '@/assets/support/chevron.svg';
import plus from '@/assets/support/plus.svg';
import warning from '@/assets/support/warning.svg';
import search from '@/assets/support/search.svg';
import ticket from '@/assets/support/ticket.svg';
import send from '@/assets/support/send.svg';
import clock from '@/assets/support/clock.png';
import sendCompact from '@/assets/support/send-compact.svg';
import paperclip from '@/assets/support/paperclip.svg';
const icons = { support, close, chevron, plus, warning, search, ticket, send, sendCompact, clock, paperclip };
// Keep the exported icons' intrinsic width/height; never stretch their viewBox.
export function SupportIcon({ name }) { return <img aria-hidden="true" alt="" src={icons[name]} className="shrink-0" />; }
export function TicketAvatar({ ticket }) { return <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-900 dark:bg-green-900 dark:text-green-100">{ticketInitials(ticket)}</span>; }
export function SupportTicketRow({ ticket, selected, onSelect }) {
  const date = ticket.updated_at || ticket.created_at;
  return <Button type="button" aria-pressed={selected} onClick={onSelect} className="trace-support-ticket trace-button-lift w-full text-left">
    <span className="grid w-full min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-3">
      <TicketAvatar ticket={ticket} />
      <span className="min-w-0 space-y-1">
        <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2"><span className="min-w-0 flex-1 break-words font-bold">#{ticket.id} {ticket.subject}</span>{supportTime(date) && <time dateTime={date} title={`${supportDay(date)} · Manila`} className="text-xs text-gray-500 dark:text-gray-400">{supportTime(date)}</time>}</span>
        <span className="block break-words text-xs text-gray-600 dark:text-gray-300">{SUPPORT_STATES[ticket.state]}{ticket.read_only && ' · Read-only'}</span>
        <span className="block truncate text-sm text-gray-600 dark:text-gray-300" title={ticket.tracking_number || ticket.student_name || 'General support'}>{ticket.tracking_number || ticket.student_name || 'General support'}</span>
      </span>
    </span>
  </Button>;
}
export function SupportEmptyState({ student = false, monitor = false }) {
  return <div className="flex h-full min-h-48 min-w-0 flex-col items-center justify-center gap-4 rounded-xl bg-gray-50 p-5 text-center dark:bg-gray-900">
    <img src={empty} alt="" aria-hidden="true" width="122" height="116" className="shrink-0" />
    <h3 className="text-lg font-bold text-trace-ink dark:text-gray-100">Select a ticket to read its conversation.</h3>
    <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300">{monitor ? 'Choose an operational ticket to monitor its authorized history. Staff concerns are handled in Internal assistance.' : student ? 'You can ask for help without a document request. Only one unresolved general ticket is allowed; opening another returns to that ticket.' : 'Choose a ticket from the list, or open a new linked ticket for an authorized request.'}</p>
  </div>;
}
export function MessageDateSeparator({ value }) {
  const day = supportDay(value);
  return day ? <div className="flex items-center gap-3 py-2 text-center text-xs text-gray-600 dark:text-gray-300"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /><span>{day} · Manila</span><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div> : null;
}
