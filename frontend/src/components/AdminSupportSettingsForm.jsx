import { useState } from 'react';
import Button from '@/components/Button';
import NumberInput from '@/components/NumberInput';
import AdminIcon from '@/features/admin/components/AdminIcon';

export default function AdminSupportSettingsForm({ config, onStage, busy }) {
  const [draft, setDraft] = useState(() => ({ ...config, closed_dates: [...config.closed_dates] }));
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const update = (name, value) => { setError(''); setDraft(previous => ({ ...previous, [name]: value })); };
  const time = minutes => String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  const addDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (draft.closed_dates.length >= 366) { setError('You can add up to 366 closed dates.'); return; }
    if (!draft.closed_dates.includes(date)) update('closed_dates', [...draft.closed_dates, date].sort());
    setDate('');
  };
  const submit = event => {
    event.preventDefault();
    if (!draft.weekdays.length) { setError('Select at least one live support day.'); return; }
    if (draft.open_minute >= draft.close_minute) { setError('Opening time must come before closing time.'); return; }
    if (draft.warning_minutes >= draft.timeout_minutes) { setError('Warning must come before timeout.'); return; }
    setError(''); onStage({ kind: 'settings', settings: { ...draft, closed_dates: [...draft.closed_dates] } });
  };
  return <form id="support-settings-form" className="trace-admin-support-settings space-y-6" onSubmit={submit}>
    <p className="trace-admin-neutral-notice"><AdminIcon name="support-info" /><span><strong>Global settings affect live claims and future reply clocks.</strong> Existing clocks retain their starting settings.</span></p>
    {error && <p role="alert" className="trace-inline-error">{error}</p>}
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="trace-admin-security-heading"><span className="trace-admin-neutral-icon"><AdminIcon name="support-calendar-days" /></span>Live support schedule</h4><span className="trace-admin-timezone"><AdminIcon name="support-globe" />Asia/Manila</span></div>
      <fieldset disabled={busy}><legend className="trace-label flex w-full flex-wrap items-center justify-between gap-2">Live Support Days<span className="trace-admin-caption">{draft.weekdays.length} days selected</span></legend><div className="trace-admin-weekdays">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <label key={day} className={draft.weekdays.includes(index) ? 'trace-admin-weekday-selected' : ''}><input type="checkbox" className="trace-choice" checked={draft.weekdays.includes(index)} onChange={event => update('weekdays', event.target.checked ? [...draft.weekdays, index].sort() : draft.weekdays.filter(value => value !== index))} />{day}</label>)}</div></fieldset>
      <div className="trace-form-grid">{[['open_minute', 'Opening Time'], ['close_minute', 'Closing Time']].map(([name, label]) => <label className="trace-label" key={name}>{label}<input required type="time" className="trace-control mt-2 w-full" disabled={busy} value={time(draft[name])} onChange={event => { if (!event.target.value) return; const [hours, minutes] = event.target.value.split(':').map(Number); update(name, hours * 60 + minutes); }} /></label>)}</div>
    </section>
    <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700"><div><h4 className="trace-admin-security-heading"><span className="trace-admin-neutral-icon"><AdminIcon name="support-calendar-off" /></span>Closed Dates</h4><p className="trace-admin-caption pl-[42px]">Add dates when live support will be unavailable.</p></div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3.5 dark:border-gray-700"><label className="min-w-0 flex-1 basis-48"><span className="sr-only">Select closed date</span><input type="date" className="trace-control w-full" value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></label><Button type="button" className="trace-button trace-button-primary" disabled={busy || !date || draft.closed_dates.includes(date)} onClick={addDate}><AdminIcon name="support-plus" />Add date</Button></div>
      {!!draft.closed_dates.length && <ul className="flex flex-wrap gap-2" aria-label="Closed Dates">{draft.closed_dates.map(value => <li key={value} className="trace-admin-badge trace-admin-badge-neutral font-mono">{value}<Button type="button" className="trace-action px-1" disabled={busy} aria-label={'Remove closed date ' + value} onClick={() => update('closed_dates', draft.closed_dates.filter(item => item !== value))}>×</Button></li>)}</ul>}
      <p className="trace-admin-caption">Leave empty if there are no closed dates. FAQ access and ticket submission stay available outside hours.</p>
    </section>
    <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700"><h4 className="trace-admin-security-heading"><span className="trace-admin-neutral-icon"><AdminIcon name="support-timer" /></span>Student reply clocks</h4>
      <div className="trace-form-grid">{[['warning_minutes', 'Reply Warning (Service Minutes)'], ['timeout_minutes', 'Reply Timeout (Service Minutes)']].map(([name, label]) => <label className="trace-label" key={name}>{label.replace(' (Service Minutes)', '')}<span className="trace-admin-input-with-unit"><NumberInput aria-label={label} required min="1" max="60" step="1" value={draft[name]} disabled={busy} onChange={event => update(name, Number(event.target.value))} className="trace-control" /><span aria-hidden="true">minutes</span></span></label>)}</div>
      <p className="trace-admin-caption flex items-center gap-2"><AdminIcon name="support-circle-check" />Warning must come before timeout.</p>
      <p className="trace-admin-neutral-notice">The explicit Request student reply action starts the clock; ordinary staff messages do not. Timeout releases the clerk and moves the ticket to Awaiting student, never Resolved.</p>
    </section>
  </form>;
}
