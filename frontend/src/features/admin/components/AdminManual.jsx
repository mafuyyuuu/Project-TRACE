import { useState } from 'react';
import Button from '@/components/Button';
import MotionDetails from '@/components/MotionDetails';

const TOPICS = ['Dashboard & Analytics', 'Maintenance', 'Accounts', 'Reports'];
const FEATURED = {
  'Dashboard & Analytics': ['What do the dashboard insights mean?', 'How do I read Support Analytics?'],
  Maintenance: ['Can I restore Good Moral or change the Diploma fee?', 'How do I set document availability and fees?', 'How do I manage approved programs?'],
  Accounts: ['Where do I manage accounts?', 'How do I review pending registrations?'],
  Reports: ['How do I export records?'],
};

/** Figma's manual layout; answers remain supplied by the role-aware manual. */
export default function AdminManual({ entries, error }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All topics');
  const featured = new Set(Object.values(FEATURED).flat());
  const matches = entry => entry.join(' ').toLowerCase().includes(query.toLowerCase().trim());
  const groups = [...TOPICS.map(name => ({ name, entries: FEATURED[name].map(question => entries.find(entry => entry[0] === question)).filter(Boolean) })), { name: 'More guidance', entries: entries.filter(entry => !featured.has(entry[0])) }];
  const visible = groups.filter(group => topic === 'All topics' || group.name === topic).map(group => ({ ...group, entries: group.entries.filter(matches) })).filter(group => group.entries.length);
  return <section className="trace-page trace-admin-manual" aria-label="User Manual / FAQ">
    <header><h1 className="trace-page-title">User Manual / FAQ</h1><p className="trace-page-description">Guidance for your TRACE account. Contact the PLP Registrar for unresolved record or account concerns.</p></header>
    {error && <p role="alert" className="trace-inline-error">{error}</p>}
    <label className="block"><span className="sr-only">Search the manual</span><input type="search" maxLength={255} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the manual — try “export” or “account”" className="trace-control w-full min-h-12" /></label>
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="trace-section overflow-hidden" aria-label="Browse topics"><h2 className="px-5 pt-4 text-[0.6875rem] font-semibold uppercase text-gray-500 dark:text-gray-400">Browse topics</h2><div className="space-y-2 p-3">
        {['All topics', ...TOPICS].map(name => <Button type="button" key={name} onClick={() => setTopic(name)} aria-pressed={topic === name} className={`trace-action block w-full rounded-lg px-3 py-2.5 text-left text-xs ${topic === name ? 'bg-emerald-50 font-semibold text-trace-emerald dark:bg-green-950 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`}>{name}</Button>)}
      </div></aside>
      <div className="min-w-0 space-y-6">{visible.map(group => <section key={group.name} className="space-y-3" aria-label={group.name}><h2 className="text-[0.6875rem] font-semibold uppercase text-gray-500 dark:text-gray-400">{group.name}</h2>
        {group.entries.map(([question, answer]) => <MotionDetails key={question} defaultOpen={!query && topic === 'All topics' && question === 'What do the dashboard insights mean?'} summary={question}><p className="select-text text-[0.8125rem] leading-relaxed text-gray-600 dark:text-gray-300">{answer}</p></MotionDetails>)}
      </section>)}{!visible.length && <p role="status" className="trace-admin-notice">No manual entries match this search.</p>}</div>
    </div>
  </section>;
}
