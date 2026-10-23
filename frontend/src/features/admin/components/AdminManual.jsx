import StudentIcon from '@/features/student/components/StudentIcon';
import AdminIcon from './AdminIcon';
import { useState } from 'react';
import Button from '@/components/Button';
import MotionDetails from '@/components/MotionDetails';
import FaqFeedback from '@/components/FaqFeedback';

const TOPICS = ['Dashboard & Analytics', 'Maintenance', 'Accounts', 'Reports'];
const FEATURED = {
  'Dashboard & Analytics': ['What do the dashboard insights mean?', 'How do I read Support Analytics?'],
  Maintenance: ['Can I restore Good Moral or change the Diploma fee?', 'How do I set document availability and fees?', 'How do I manage approved programs?'],
  Accounts: ['Where do I manage accounts?', 'How do I review pending registrations?'],
  Reports: ['How do I export records?'],
};

/** Figma's manual layout; answers remain supplied by the role-aware manual. */
export default function AdminManual({ entries, error, reviews, student = false, windowClerk = false, desk = '' }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All topics');
  const deskTopics = desk === 'Secretary' ? { 'Cases & Conversations': ['Which college owns a case conversation?', 'How do staff conversations work?', 'How does Internal Assistance work?'], 'Evaluation & Pricing': ['How do I evaluate and price a request?', 'Must the Official Receipt be uploaded immediately?'], 'Students & Records': ['How do I view a student’s full profile?', 'How do I export records?'] } : desk === 'Finance' ? { 'Payments & Receipts': ['How do I record counter payments?', 'Can I issue or upload the receipt later?', 'Where does the name on an OR come from?'], 'Reports & Records': ['How do I export Finance transactions?', 'How do I view a student’s full profile?'], 'Support & Collaboration': ['How do staff conversations work?', 'How does Internal Assistance work?'] } : null;
  const topics = deskTopics ? Object.keys(deskTopics) : windowClerk ? ['Intake & Release', 'Accounts', 'Support', 'Reports'] : student ? ['Requesting Document', 'Accounts', 'Support'] : TOPICS;
  const configuration = deskTopics || (windowClerk ? Object.fromEntries(topics.map((name, index) => [name, entries.filter(([question]) => index === 0 ? /intake|scan|release|original|receipt|walk-in|request/i.test(question) : index === 1 ? /profile|account|password|authenticator|browser|details/i.test(question) : index === 2 ? /support|staff conversation|internal|messages/i.test(question) : /export/i.test(question)).map(([question]) => question)])) : student ? Object.fromEntries(topics.map((name, index) => [name, entries.filter(([question]) => index === 0 ? /request|year|payment|price|receipt/i.test(question) : index === 1 ? /profile|account|password|authenticator|ID|name/i.test(question) && !/request|year|payment|price|receipt/i.test(question) : /messages|support|ticket/i.test(question)).map(([question]) => question)])) : FEATURED);
  const featured = new Set(Object.values(configuration).flat());
  const matches = entry => entry.join(' ').toLowerCase().includes(query.toLowerCase().trim());
  const groups = [...topics.map(name => ({ name, entries: configuration[name].map(question => entries.find(entry => entry[0] === question)).filter(Boolean) })), { name: 'More guidance', entries: entries.filter(entry => !featured.has(entry[0])) }];
  const visible = groups.filter(group => topic === 'All topics' || group.name === topic).map(group => ({ ...group, entries: group.entries.filter(matches) })).filter(group => group.entries.length);
  return <section className="trace-page trace-admin-more-page trace-admin-manual" aria-label="User Manual / FAQ">
    <header className="trace-standard-heading"><h1 className="trace-page-title">User Manual / FAQ</h1><p className="trace-page-description">Guidance for your TRACE account. Contact the PLP Registrar for unresolved record or account concerns.</p></header>
    {error && <p role="alert" className="trace-inline-error">{error}</p>}
    {reviews?.loadError && <div role="alert" className="trace-inline-error">{reviews.loadError} <Button type="button" className="trace-action" onClick={reviews.reload}>Retry feedback</Button></div>}
    <label className="trace-admin-manual-search">{student ? <StudentIcon name="search-bd535" /> : <AdminIcon name="search" />}<span className="sr-only">Search the manual</span><input type="search" maxLength={255} value={query} onChange={event => setQuery(event.target.value)} placeholder={desk === 'Secretary' ? 'Search the manual — try “official receipt” or “pricing”' : desk === 'Finance' ? 'Search the manual — try “counter payment” or “export”' : 'Search the manual — try “export records” or “fees”'} className="trace-control w-full min-h-12" /></label>
    <div className="trace-manual-layout">
      <aside className="trace-section overflow-hidden" aria-label="Browse topics"><h2 className="px-5 pt-4 text-[0.6875rem] font-semibold uppercase text-gray-500 dark:text-gray-400">Browse topics</h2><div className="space-y-2 p-3">
        {['All topics', ...topics].map(name => <Button type="button" key={name} onClick={() => setTopic(name)} aria-pressed={topic === name} className={`trace-action block w-full rounded-lg px-3 py-2.5 text-left text-xs ${topic === name ? 'bg-emerald-50 font-semibold text-trace-emerald dark:bg-green-950 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`}>{name} <span className="trace-admin-caption ml-1">{name === 'All topics' ? entries.length : groups.find(group => group.name === name)?.entries.length || 0}</span></Button>)}
      </div></aside>
      <div className="trace-manual-questions" role="region" aria-label="FAQ answers" tabIndex={0}>{visible.map(group => <section key={group.name} className="space-y-3" aria-label={group.name}><h2 className="text-[0.6875rem] font-semibold uppercase text-gray-500 dark:text-gray-400">{group.name}</h2>
        {group.entries.map(([question, answer]) => <MotionDetails key={question} onOpen={()=>reviews?.view(question)} defaultOpen={!query && topic === 'All topics' && question === ((student || windowClerk || deskTopics) ? visible[0]?.entries[0]?.[0] : 'What do the dashboard insights mean?')} summary={<span className="flex min-w-0 items-center gap-3"><span>{question}</span><span className="trace-admin-manual-chevron">{student ? <><StudentIcon name="chevron-right-e7b86" /><StudentIcon name="chevron-down-2004f" /></> : <><AdminIcon name="manual-right" /><AdminIcon name="manual-down" /></>}</span></span>}><p className="select-text text-[0.8125rem] leading-relaxed text-gray-600 dark:text-gray-300">{answer}</p><FaqFeedback question={question} reviews={reviews}/></MotionDetails>)}
      </section>)}{!visible.length && <p role="status" className="trace-admin-notice">No manual entries match this search.</p>}</div>
    </div>
  </section>;
}
