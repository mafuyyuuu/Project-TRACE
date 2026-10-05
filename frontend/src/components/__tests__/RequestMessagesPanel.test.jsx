import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
const state = vi.hoisted(() => ({ tickets:[],cursor:null,loading:false,error:'',notice:'',settings:null,topics:[],selected:'',setSelected:vi.fn(),busy:false,execute:vi.fn(),refresh:vi.fn(),retry:vi.fn() }));
vi.mock('@/hooks/useSupportTickets', () => ({ default: () => state }));
vi.mock('@/hooks/useSupportRequestChoices', () => ({ default: () => ({rows:[],hasMore:false,error:'',busy:false}) }));
vi.mock('@/components/SupportConversation', () => ({ default: ({ticketId}) => <div>Ticket conversation {ticketId}</div> }));
beforeEach(() => { Object.assign(state,{tickets:[],cursor:null,selected:'',error:'',settings:null}); vi.clearAllMocks(); });
it('offers a general ticket without requiring a document and removes obsolete tabs/page buttons', () => {
  render(<RequestMessagesPanel user={{id:3,role:'student'}} />);
  expect(screen.getByText(/Choose New ticket for FAQ assistance/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'New ticket'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'General support'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Previous|Next/})).not.toBeInTheDocument();
});
it('clearly selects a ticket and keeps older tickets reachable incrementally', () => {
  state.tickets = [{id:11,subject:'Synthetic help',state:'QUEUED'}]; state.selected = '11'; state.cursor = 11;
  render(<RequestMessagesPanel user={{id:4,role:'clerk',desk_assignment:'Window 1'}} />);
  expect(screen.getByRole('button',{name:/Synthetic help/})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByText('Ticket conversation 11')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Load older tickets'})); expect(state.refresh).toHaveBeenCalledWith(11);
});
it('opens a selected notification ticket even outside the loaded list', () => {
  state.selected = '42'; render(<RequestMessagesPanel user={{id:3,role:'student'}} />);
  expect(screen.getByText('Ticket conversation 42')).toBeInTheDocument();
});
it('exposes list failures and retries', () => {
  state.error='Unavailable'; render(<RequestMessagesPanel user={{id:4,role:'clerk',desk_assignment:'Window 1'}} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByRole('button',{name:'Retry support'})); expect(state.retry).toHaveBeenCalledOnce();
});
it.each(['Finance','Secretary'])('retains %s linked-only presentation without general ticket creation', desk_assignment => {
  render(<RequestMessagesPanel user={{id:4,role:'clerk',desk_assignment}} />);
  expect(screen.getByText(/Linked request tickets only/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'New ticket'})).not.toBeInTheDocument();
});
