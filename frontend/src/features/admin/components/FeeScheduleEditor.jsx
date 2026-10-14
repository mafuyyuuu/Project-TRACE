import NumberInput from '@/components/NumberInput';
import { NUMBER_LIMITS } from '@/utils/inputLimits';
import Button from '@/components/Button';
import AdminIcon from './AdminIcon';
const emptySchedule = () => ({ base_fee: 0, fee_rule: 'flat', rental_fee: 0, special_fee: 0, fee_items: [] });
const inputClass = "trace-control w-full";

function NamedItems({ items, onChange, admin = false }) {
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold">{admin ? 'Named fees' : 'Included documents / named fees'}</p>{admin && <p className="trace-admin-caption">Each named fee is charged once per document type in a request.</p>}</div>{admin && <Button type="button" className="trace-button trace-button-secondary" disabled={items.length >= 30} onClick={() => onChange([...items, { label: '', amount: 0 }])}><AdminIcon name="drawer-plus" />Add named fee</Button>}</div>
    {items.map((item, index) => <div key={index} className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-[1_1_12rem] text-xs">Item name<input className={inputClass} required maxLength={100} value={item.label}
        onChange={event => onChange(items.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} /></label>
      <label className="trace-label w-24">Item fee (₱)<NumberInput max={NUMBER_LIMITS.money} className={inputClass} required type="number" min="0" step="0.01" value={item.amount}
        onChange={event => onChange(items.map((row, i) => i === index ? { ...row, amount: event.target.value } : row))} /></label>
      <label className="trace-label min-w-0">Fee basis<select className={inputClass} value={item.fee_rule || 'flat'}
        onChange={event => onChange(items.map((row, i) => i === index ? { ...row, fee_rule: event.target.value } : row))}>
        <option value="flat">Once per request</option><option value="per_page">Per printed page per copy</option>
      </select></label>
      <Button type="button" className="trace-button trace-button-danger" aria-label={`Remove fee item ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</Button>
    </div>)}
    {!admin && <Button type="button" className="trace-button trace-button-secondary" disabled={items.length >= 30}
      onClick={() => onChange([...items, { label: '', amount: 0 }])}>Add named fee</Button>}
  </div>;
}
function ExtraFees({ schedule, onChange, admin = false }) {
  return <><div className="grid grid-cols-2 gap-2">{[['rental_fee', 'Rental Fee (₱)'], ['special_fee', 'Special Fee (₱)']].map(([key, label]) =>
    <label key={key} className="trace-label">{label}<NumberInput max={NUMBER_LIMITS.money} className={inputClass} required type="number" min="0" step="0.01" value={schedule[key] ?? 0}
      onChange={event => onChange({ ...schedule, [key]: event.target.value })} /></label>)}</div>
    <NamedItems admin={admin} items={schedule.fee_items || []} onChange={fee_items => onChange({ ...schedule, fee_items })} /></>;
}
export default function FeeScheduleEditor({ value, colleges, onChange, admin = false }) {
  const overrides = value.college_fee_schedules || [];
  const updateOverride = (index, next) => onChange({ ...value, college_fee_schedules: overrides.map((row, i) => i === index ? next : row) });
  return <div className={admin ? 'trace-admin-fee-schedules space-y-4' : 'space-y-4'}>
    <fieldset className="space-y-3"><legend className="text-sm font-bold">{admin ? 'Extra fees' : 'Default extra fees'}</legend>
      {admin && <p className="trace-admin-caption">Charged once per request, regardless of the number of copies.</p>}
      <ExtraFees admin={admin} schedule={value} onChange={onChange} />
      <p className="text-xs text-gray-500">Rental, Special and fixed named fees apply once. Page-based components use their own pages per copy.</p>
    </fieldset>
    <fieldset className="space-y-3"><legend className="text-sm font-bold">College fee overrides</legend>
      <p className="text-xs text-gray-500">A college override replaces the complete default schedule. Other colleges use the default.</p>
      {overrides.map((row, index) => <fieldset key={index} className="space-y-2 rounded-xl border border-gray-300 dark:border-gray-600 p-3">
        <legend className="text-xs font-semibold">Override {index + 1}</legend>
        <label className="trace-label">College<select className={inputClass} required value={row.college_id || ''}
          onChange={event => updateOverride(index, { ...row, college_id: Number(event.target.value) })}>
          <option value="">Choose college</option>{colleges.map(college => <option key={college.id} value={college.id}>{college.name}</option>)}
        </select></label>
        <label className="trace-label block">College base rate (₱)<NumberInput max={NUMBER_LIMITS.money} className={inputClass} required type="number" min="0" step="0.01" value={row.base_fee}
          onChange={event => updateOverride(index, { ...row, base_fee: event.target.value })} /></label>
        <label className="trace-label block">College fee basis<select className={inputClass} value={row.fee_rule}
          onChange={event => updateOverride(index, { ...row, fee_rule: event.target.value })}>
          <option value="flat">Flat fee per copy</option><option value="per_semester_block">Legacy semester-block estimate</option><option value="per_page">Per printed page per copy</option>
        </select></label>
        <ExtraFees schedule={row} onChange={next => updateOverride(index, next)} />
        <Button type="button" className="trace-button trace-button-danger" onClick={() => onChange({ ...value, college_fee_schedules: overrides.filter((_, i) => i !== index) })}>Remove college override</Button>
      </fieldset>)}
      <div className={admin && !overrides.length ? 'trace-admin-overrides-empty' : undefined}>{admin && !overrides.length && <p className="text-sm">No college overrides yet</p>}<Button type="button" className="trace-button trace-button-secondary" disabled={overrides.length >= 100}
        onClick={() => onChange({ ...value, college_fee_schedules: [...overrides, { ...emptySchedule(), college_id: null }] })}>{admin && <AdminIcon name="drawer-plus" />}Add college override</Button></div>
    </fieldset>
  </div>;
}
