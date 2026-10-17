import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupportConversation from '@/components/SupportConversation';

const { chat } = vi.hoisted(() => ({ chat: {
  data: { ticket: { id:11, subject:'Synthetic concern', state:'IN_PROGRESS', assigned_to:2, read_only:false,document_id:12,tracking_number:'TRC-SYNTHETIC' }, window:{open:true} },
  messages:[], files:[], input:'', refresh:vi.fn(), setInput:vi.fn(), setFiles:vi.fn(), send:vi.fn(), change:vi.fn(), faq:vi.fn(),
} }));
vi.mock('@/hooks/useSupportConversation', () => ({default:() => chat}));
vi.mock('@/hooks/useSupportFaqSuggestions', () => ({default:() => ({topics:[]})}));
vi.mock('@/hooks/useMotion', () => ({default:vi.fn()}));
beforeEach(() => { vi.clearAllMocks(); });

it.each([
  {id:2,role:'student',user_type:'student'},
  {id:2,role:'student',user_type:'alumni'},
  {id:2,role:'admin'},
  {id:2,role:'clerk',desk_assignment:'Window 1'},
  {id:2,role:'clerk',desk_assignment:'Receiving Desk'},
  {id:2,role:'clerk',desk_assignment:'Secretary'},
  {id:2,role:'clerk',desk_assignment:'Finance'},
])('keeps guidance visible without Ticket actions disclosure for $role $desk_assignment $user_type', user => {
  render(<SupportConversation user={user} ticketId={11} topics={[]} compact autoFocusConversation={false} />);
  expect(screen.queryByText(/^Ticket actions$/i)).not.toBeInTheDocument();
  const note = document.querySelector('[aria-label="Support conversation note"]');
  expect(note).not.toBeVisible();
  expect(screen.getByText('Conversation guidance')).toBeVisible();
  expect(note.closest('header')).toBeNull();
  const info=screen.getByRole('button',{name:'Open linked case'});
  expect(info).toBeVisible();
  expect(info).toHaveTextContent('');
  expect(info.querySelector('img')).toHaveAttribute('src','/admin-figma/info.svg');
  expect(screen.getByText('In progress',{exact:true})).toHaveClass('trace-support-state');
  expect(screen.getByRole('heading',{name:'#11 Synthetic concern'}).closest('details')).toBeNull();
  expect(note.closest('details')).not.toBeNull();
  expect(note.compareDocumentPosition(screen.getByRole('generic',{name:'Conversation history'})) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  if (user.role === 'admin') expect(note).toHaveTextContent('Admin monitors this ticket');
  if (user.desk_assignment === 'Secretary') expect(screen.getByRole('button',{name:'Resolve ticket'})).toHaveAttribute('title','Resolve ticket');
});
