import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupportConversation from '@/components/SupportConversation';

const { chat } = vi.hoisted(() => ({ chat: {
  data: { ticket: { id:11, subject:'Synthetic concern', state:'IN_PROGRESS', assigned_to:2, read_only:false }, window:{open:true} },
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
  const note = screen.getByRole('complementary',{name:'Support conversation note'});
  expect(note).toBeVisible();
  expect(note.closest('details')).toBeNull();
  expect(note.compareDocumentPosition(screen.getByRole('generic',{name:'Conversation history'})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  if (user.role === 'admin') expect(note).toHaveTextContent('Admin monitors this ticket');
  if (user.desk_assignment === 'Secretary') expect(screen.getByRole('button',{name:'Resolve ticket'})).toBeInTheDocument();
});
